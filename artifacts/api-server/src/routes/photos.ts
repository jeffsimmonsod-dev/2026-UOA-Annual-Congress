import { Router, type Request, type Response } from "express";
import { Readable } from "stream";
import { randomUUID } from "crypto";
import multer from "multer";
import { ObjectStorageService, ObjectNotFoundError, objectStorageClient } from "../lib/objectStorage";
import { uploadPhotoToDrive, deleteDriveFile } from "../lib/googleDrive";
import { pool } from "../lib/db";
import { clientIp, checkAdminPin, requireAdmin, sendAdminFailure } from "../lib/adminAuth";

const router = Router();
const objectStorageService = new ObjectStorageService();

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/heic",
  "image/heif",
]);

const HEIC_BRANDS = new Set(["heic", "heix", "hevc", "hevx", "mif1", "msf1"]);

function detectMimeFromMagicBytes(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  // PNG: 89 50 4E 47
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "image/png";
  // GIF: 47 49 46 38
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) return "image/gif";
  // WebP: RIFF....WEBP
  if (
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  ) return "image/webp";
  // HEIC/HEIF: ISO BMFF — "ftyp" box at offset 4, then major brand
  if (buf[4] === 0x66 && buf[5] === 0x74 && buf[6] === 0x79 && buf[7] === 0x70) {
    const brand = buf.slice(8, 12).toString("ascii").replace(/\0/g, "").toLowerCase();
    if (HEIC_BRANDS.has(brand)) return "image/heic";
  }
  return null;
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  // Accept all MIME types here — Android often sends application/octet-stream.
  // Real validation is done via magic bytes after multer parses the body.
});

async function ensureTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS congress_photos (
      id                 TEXT PRIMARY KEY,
      object_path        TEXT NOT NULL,
      uploader_name      TEXT NOT NULL,
      uploader_device_id TEXT NOT NULL,
      caption            TEXT NOT NULL DEFAULT '',
      drive_file_id      TEXT,
      created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS congress_photo_likes (
      photo_id   TEXT NOT NULL REFERENCES congress_photos(id) ON DELETE CASCADE,
      device_id  TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (photo_id, device_id)
    );
    CREATE TABLE IF NOT EXISTS congress_sessions (
      session_token TEXT PRIMARY KEY,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    DROP INDEX IF EXISTS idx_congress_photos_created;
    CREATE INDEX idx_congress_photos_created ON congress_photos(created_at);
    CREATE INDEX IF NOT EXISTS idx_congress_photo_likes_photo ON congress_photo_likes(photo_id);
  `);
  await pool.query(`
    ALTER TABLE congress_photos ADD COLUMN IF NOT EXISTS drive_file_id TEXT;
  `);
  await pool.query(`
    ALTER TABLE congress_photos ADD COLUMN IF NOT EXISTS delete_token TEXT;
  `);
  // Backfill any existing photos that were uploaded before delete_token was introduced
  await pool.query(`
    UPDATE congress_photos SET delete_token = gen_random_uuid()::text WHERE delete_token IS NULL;
  `);
}

ensureTables().catch(console.error);

function photoToJSON(row: any, deviceId?: string) {
  return {
    id: row.id,
    objectPath: row.object_path,
    uploaderName: row.uploader_name,
    caption: row.caption,
    likes: parseInt(row.likes ?? "0", 10),
    likedByMe: deviceId ? (row.liked_by_me === true || row.liked_by_me === "true") : false,
    createdAt: row.created_at,
  };
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

// Simple in-memory sliding-window rate limiter
const rateLimitWindows = new Map<string, number[]>();

function isRateLimited(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const timestamps = (rateLimitWindows.get(key) ?? []).filter((t) => now - t < windowMs);
  if (timestamps.length >= maxRequests) return true;
  timestamps.push(now);
  rateLimitWindows.set(key, timestamps);
  return false;
}

// Periodically clean up stale rate-limit entries to avoid unbounded memory growth
setInterval(() => {
  const cutoff = Date.now() - 3_600_000; // 1 hour
  for (const [key, timestamps] of rateLimitWindows.entries()) {
    const fresh = timestamps.filter((t) => t > cutoff);
    if (fresh.length === 0) rateLimitWindows.delete(key);
    else rateLimitWindows.set(key, fresh);
  }
}, 300_000); // every 5 minutes

// Issue a new server-generated session token
// Rate-limited: max 30 sessions per IP per hour to prevent Sybil identity farming
// while allowing conference NAT environments where many users share an IP
router.post("/photos/session", async (req: Request, res: Response) => {
  const ip = clientIp(req);
  if (isRateLimited(`session:${ip}`, 30, 3_600_000)) {
    res.status(429).json({ error: "Too many session requests. Please try again later." });
    return;
  }
  try {
    const sessionToken = randomUUID();
    await pool.query(
      `INSERT INTO congress_sessions (session_token) VALUES ($1)`,
      [sessionToken]
    );
    res.status(201).json({ sessionToken });
  } catch (err) {
    req.log.error({ err }, "photo session error");
    res.status(500).json({ error: "Failed to create session" });
  }
});

// Upload image through server → GCS, register in DB, return photo
router.post("/photos/upload", upload.single("photo"), async (req: Request, res: Response) => {
  const { uploaderName, caption, sessionToken } = req.body as {
    uploaderName?: string;
    caption?: string;
    sessionToken?: string;
  };

  req.log.info({
    hasFile: !!req.file,
    fileSize: req.file?.size,
    fileMime: req.file?.mimetype,
    bodyKeys: Object.keys(req.body ?? {}),
    hasUploaderName: !!uploaderName,
    hasSessionToken: !!sessionToken,
    contentType: req.headers["content-type"]?.slice(0, 80),
  }, "photos/upload debug");

  if (!req.file && !uploaderName && !sessionToken) {
    res.status(400).json({ error: "Request body was empty or not multipart — check Content-Type header", contentType: req.headers["content-type"]?.slice(0, 80) ?? "missing" });
    return;
  }
  if (!req.file || !uploaderName || !sessionToken) {
    res.status(400).json({ error: "photo file, uploaderName, and sessionToken are required", missing: { file: !req.file, uploaderName: !uploaderName, sessionToken: !sessionToken } });
    return;
  }

  // Verify the session token was issued by this server
  const sessionCheck = await pool.query(
    `SELECT 1 FROM congress_sessions WHERE session_token = $1 LIMIT 1`,
    [sessionToken]
  );
  if (sessionCheck.rows.length === 0) {
    res.status(403).json({ error: "Invalid session token" });
    return;
  }

  const detectedMime = detectMimeFromMagicBytes(req.file.buffer);
  if (!detectedMime) {
    res.status(400).json({ error: "File content does not match a supported image format" });
    return;
  }

  try {
    // Get a private upload path
    const uploadURL = await objectStorageService.getObjectEntityUploadURL();
    const u = new URL(uploadURL);
    const rawGcsUrl = `${u.protocol}//${u.host}${u.pathname}`;

    // Upload the image buffer to GCS using the signed URL; use server-detected MIME type
    const putResp = await fetch(uploadURL, {
      method: "PUT",
      headers: { "Content-Type": detectedMime },
      body: req.file.buffer,
    });

    if (!putResp.ok) {
      res.status(502).json({ error: `GCS upload failed: ${putResp.status}` });
      return;
    }

    // Normalize the GCS URL to the internal object path
    const objectPath = objectStorageService.normalizeObjectEntityPath(rawGcsUrl);
    if (!objectPath.startsWith("/objects/")) {
      req.log.error({ rawGcsUrl, objectPath }, "photo upload path normalization failed");
      res.status(500).json({ error: "Upload failed" });
      return;
    }

    const id = Date.now().toString() + Math.random().toString(36).slice(2, 7);
    const deleteToken = randomUUID();
    const cleanName = (uploaderName as string).trim().slice(0, 50);
    const cleanCaption = (caption ?? "").trim().slice(0, 200);

    const extMap: Record<string, string> = {
      "image/png": "png", "image/gif": "gif", "image/webp": "webp",
      "image/heic": "heic", "image/heif": "heif",
    };
    const ext = extMap[detectedMime] ?? "jpg";
    const driveFileName = `${new Date().toISOString().replace(/[:.]/g, "-")}_${cleanName.replace(/\s+/g, "_")}.${ext}`;

    // Mirror to Google Drive before storing the record so drive_file_id is
    // captured in the INSERT and is available immediately if the user deletes.
    // Capped at 5 s so a slow Drive response does not block the upload.
    let driveFileId: string | null = null;
    try {
      const driveResult = await withTimeout(
        uploadPhotoToDrive(req.file.buffer, detectedMime, driveFileName, cleanName, cleanCaption),
        5000
      );
      driveFileId = driveResult?.fileId ?? null;
    } catch (err) {
      console.error("[photos] Drive mirror failed:", err);
    }

    await pool.query(
      `INSERT INTO congress_photos (id, object_path, uploader_name, uploader_device_id, caption, drive_file_id, delete_token)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id, objectPath, cleanName, sessionToken, cleanCaption, driveFileId, deleteToken]
    );

    const row = {
      id,
      object_path: objectPath,
      uploader_name: cleanName,
      uploader_device_id: sessionToken,
      caption: cleanCaption,
      likes: "0",
      liked_by_me: false,
      created_at: new Date().toISOString(),
    };

    res.status(201).json({ ...photoToJSON(row), deleteToken });
  } catch (err) {
    req.log.error({ err }, "photo upload error");
    res.status(500).json({ error: "Upload failed" });
  }
});

router.get("/photos", async (req: Request, res: Response) => {
  const sessionToken = req.query.sessionToken as string | undefined;
  try {
    // Validate the session token if provided (unknown tokens get no likedByMe data)
    let validatedToken: string | undefined;
    if (sessionToken) {
      const check = await pool.query(
        `SELECT 1 FROM congress_sessions WHERE session_token = $1 LIMIT 1`,
        [sessionToken]
      );
      if (check.rows.length > 0) validatedToken = sessionToken;
    }
    const result = await pool.query(
      `SELECT
         p.*,
         COUNT(l.device_id) AS likes,
         EXISTS(
           SELECT 1 FROM congress_photo_likes
           WHERE photo_id = p.id AND device_id = $1
         ) AS liked_by_me
       FROM congress_photos p
       LEFT JOIN congress_photo_likes l ON l.photo_id = p.id
       GROUP BY p.id
       ORDER BY p.created_at DESC`,
      [validatedToken ?? ""]
    );
    res.json({ photos: result.rows.map((r) => photoToJSON(r, validatedToken)) });
  } catch (err) {
    req.log.error({ err }, "photo list error");
    res.status(500).json({ error: "Failed to fetch photos" });
  }
});

router.post("/photos/:id/like", async (req: Request, res: Response) => {
  const { sessionToken } = req.body as { sessionToken?: string };
  if (!sessionToken) {
    res.status(400).json({ error: "sessionToken required" });
    return;
  }
  // Rate-limit like operations: max 60 per IP per 10 minutes
  const ip = clientIp(req);
  if (isRateLimited(`like:${ip}`, 60, 600_000)) {
    res.status(429).json({ error: "Too many like requests. Please slow down." });
    return;
  }
  try {
    // Validate the session token was issued by this server
    const sessionCheck = await pool.query(
      `SELECT 1 FROM congress_sessions WHERE session_token = $1 LIMIT 1`,
      [sessionToken]
    );
    if (sessionCheck.rows.length === 0) {
      res.status(403).json({ error: "Invalid session token" });
      return;
    }
    const existing = await pool.query(
      `SELECT 1 FROM congress_photo_likes WHERE photo_id = $1 AND device_id = $2`,
      [req.params.id, sessionToken]
    );
    if (existing.rows.length > 0) {
      await pool.query(
        `DELETE FROM congress_photo_likes WHERE photo_id = $1 AND device_id = $2`,
        [req.params.id, sessionToken]
      );
    } else {
      await pool.query(
        `INSERT INTO congress_photo_likes (photo_id, device_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [req.params.id, sessionToken]
      );
    }
    const result = await pool.query(
      `SELECT p.*, COUNT(l.device_id) AS likes,
         EXISTS(SELECT 1 FROM congress_photo_likes WHERE photo_id = p.id AND device_id = $1) AS liked_by_me
       FROM congress_photos p
       LEFT JOIN congress_photo_likes l ON l.photo_id = p.id
       WHERE p.id = $2 GROUP BY p.id`,
      [sessionToken, req.params.id]
    );
    if (result.rows.length === 0) { res.status(404).json({ error: "Photo not found" }); return; }
    res.json(photoToJSON(result.rows[0], sessionToken));
  } catch (err) {
    req.log.error({ err }, "photo like error");
    res.status(500).json({ error: "Failed to toggle like" });
  }
});

async function removeStoredFiles(objectPath: string | null, driveFileId: string | null, log: Request["log"]) {
  // Delete the GCS object synchronously (bounded timeout) so the file is
  // revoked as close to the DB delete as possible.
  if (objectPath) {
    try {
      await withTimeout(objectStorageService.deleteObjectEntity(objectPath), 8000);
    } catch (err) {
      log.error({ err }, "photo delete: GCS object delete failed");
    }
  }
  // Delete the Google Drive mirror if we have its ID (non-blocking)
  if (driveFileId) {
    deleteDriveFile(driveFileId)
      .catch((err) => log.error({ err }, "photo delete: Drive delete failed"));
  }
}

router.delete("/photos/:id", async (req: Request, res: Response) => {
  const photoId = String(req.params.id);

  // Requests that carry an x-admin-pin header are treated as admin deletes and
  // go through the same lockout + constant-time check as other admin routes.
  if (req.headers["x-admin-pin"] !== undefined) {
    const auth = checkAdminPin(clientIp(req), req.headers["x-admin-pin"]);
    if (!auth.ok) {
      sendAdminFailure(res, auth, 403);
      return;
    }
    try {
      const result = await pool.query(
        `DELETE FROM congress_photos WHERE id = $1 RETURNING id, object_path, drive_file_id`,
        [photoId]
      );
      if (result.rows.length === 0) {
        res.status(404).json({ error: "Photo not found" }); return;
      }
      const { object_path, drive_file_id } = result.rows[0];
      await removeStoredFiles(object_path, drive_file_id, req.log);
      res.json({ success: true });
    } catch (err) {
      req.log.error({ err }, "photo delete error");
      res.status(500).json({ error: "Failed to delete photo" });
    }
    return;
  }

  const { deleteToken } = req.body as { deleteToken?: string };
  if (!deleteToken) { res.status(400).json({ error: "deleteToken required" }); return; }
  try {
    const result = await pool.query(
      `DELETE FROM congress_photos WHERE id = $1 AND delete_token = $2
       RETURNING id, object_path, drive_file_id`,
      [photoId, deleteToken]
    );
    if (result.rows.length === 0) {
      res.status(403).json({ error: "Photo not found or no permission" }); return;
    }

    const { object_path, drive_file_id } = result.rows[0];
    await removeStoredFiles(object_path, drive_file_id, req.log);

    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "photo delete error");
    res.status(500).json({ error: "Failed to delete photo" });
  }
});

router.get("/photos/admin", async (req: Request, res: Response) => {
  if (!requireAdmin(req, res, 403)) return;
  try {
    const result = await pool.query(
      `SELECT p.id, p.object_path, p.uploader_name, p.caption, p.created_at,
              COUNT(l.photo_id)::int AS likes
       FROM congress_photos p
       LEFT JOIN congress_photo_likes l ON l.photo_id = p.id
       GROUP BY p.id
       ORDER BY p.created_at DESC`
    );
    res.json({ photos: result.rows.map((r) => photoToJSON(r)) });
  } catch (err) {
    req.log.error({ err }, "photo list error");
    res.status(500).json({ error: "Failed to fetch photos" });
  }
});

router.get("/storage/objects/*path", async (req: Request, res: Response) => {
  try {
    const raw = req.params.path;
    const wildcardPath = Array.isArray(raw) ? raw.join("/") : raw;
    const objectPath = `/objects/${wildcardPath}`;

    // Verify that this object path belongs to an existing (non-deleted) photo
    const dbCheck = await pool.query(
      `SELECT id FROM congress_photos WHERE object_path = $1 LIMIT 1`,
      [objectPath]
    );
    if (dbCheck.rows.length === 0) {
      res.status(404).json({ error: "Object not found" });
      return;
    }

    const objectFile = await objectStorageService.getObjectEntityFile(objectPath);
    const response = await objectStorageService.downloadObject(objectFile);
    res.status(response.status);
    response.headers.forEach((value, key) => {
      if (key.toLowerCase() === "content-type") {
        const ct = value.toLowerCase().split(";")[0].trim();
        const safeType = ALLOWED_MIME_TYPES.has(ct) ? ct : "application/octet-stream";
        res.setHeader("Content-Type", safeType);
        if (!ALLOWED_MIME_TYPES.has(ct)) {
          res.setHeader("Content-Disposition", "attachment");
        }
      } else {
        res.setHeader(key, value);
      }
    });
    res.setHeader("X-Content-Type-Options", "nosniff");
    if (response.body) {
      const nodeStream = Readable.fromWeb(response.body as ReadableStream<Uint8Array>);
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    if (error instanceof ObjectNotFoundError) { res.status(404).json({ error: "Object not found" }); return; }
    res.status(500).json({ error: "Failed to serve object" });
  }
});

export default router;
