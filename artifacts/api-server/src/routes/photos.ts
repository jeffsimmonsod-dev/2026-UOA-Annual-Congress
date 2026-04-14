import { Router, type Request, type Response } from "express";
import { Readable } from "stream";
import pg from "pg";
import { ObjectStorageService, ObjectNotFoundError } from "../lib/objectStorage";

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const router = Router();
const objectStorageService = new ObjectStorageService();

function photoToJSON(row: any, deviceId?: string) {
  return {
    id: row.id,
    objectPath: row.object_path,
    uploaderName: row.uploader_name,
    uploaderDeviceId: row.uploader_device_id,
    caption: row.caption,
    likes: parseInt(row.likes ?? "0", 10),
    likedByMe: row.liked_by_me === true || row.liked_by_me === "true",
    isMyPhoto: deviceId ? row.uploader_device_id === deviceId : false,
    createdAt: row.created_at,
  };
}

router.post("/photos/upload-url", async (_req: Request, res: Response) => {
  try {
    const uploadURL = await objectStorageService.getObjectEntityUploadURL();
    res.json({ uploadURL });
  } catch (err) {
    res.status(500).json({ error: "Failed to generate upload URL", details: String(err) });
  }
});

router.post("/photos", async (req: Request, res: Response) => {
  const { objectPath, uploaderName, caption, deviceId } = req.body as {
    objectPath?: string;
    uploaderName?: string;
    caption?: string;
    deviceId?: string;
  };

  if (!objectPath || !uploaderName || !deviceId) {
    res.status(400).json({ error: "objectPath, uploaderName, and deviceId are required" });
    return;
  }

  const id = Date.now().toString() + Math.random().toString(36).slice(2, 7);

  try {
    await pool.query(
      `INSERT INTO congress_photos (id, object_path, uploader_name, uploader_device_id, caption)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, objectPath, uploaderName.trim().slice(0, 50), deviceId, (caption ?? "").trim().slice(0, 200)]
    );

    const row = {
      id,
      object_path: objectPath,
      uploader_name: uploaderName.trim().slice(0, 50),
      uploader_device_id: deviceId,
      caption: (caption ?? "").trim().slice(0, 200),
      likes: "0",
      liked_by_me: false,
      created_at: new Date().toISOString(),
    };

    res.status(201).json(photoToJSON(row, deviceId));
  } catch (err) {
    res.status(500).json({ error: "Failed to save photo", details: String(err) });
  }
});

router.get("/photos", async (req: Request, res: Response) => {
  const deviceId = req.query.deviceId as string | undefined;

  try {
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
      [deviceId ?? ""]
    );

    res.json({ photos: result.rows.map((r) => photoToJSON(r, deviceId)) });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch photos", details: String(err) });
  }
});

router.post("/photos/:id/like", async (req: Request, res: Response) => {
  const { deviceId } = req.body as { deviceId?: string };
  if (!deviceId) {
    res.status(400).json({ error: "deviceId required" });
    return;
  }

  try {
    const existing = await pool.query(
      `SELECT 1 FROM congress_photo_likes WHERE photo_id = $1 AND device_id = $2`,
      [req.params.id, deviceId]
    );

    if (existing.rows.length > 0) {
      await pool.query(
        `DELETE FROM congress_photo_likes WHERE photo_id = $1 AND device_id = $2`,
        [req.params.id, deviceId]
      );
    } else {
      await pool.query(
        `INSERT INTO congress_photo_likes (photo_id, device_id) VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [req.params.id, deviceId]
      );
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
       WHERE p.id = $2
       GROUP BY p.id`,
      [deviceId, req.params.id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: "Photo not found" });
      return;
    }

    res.json(photoToJSON(result.rows[0], deviceId));
  } catch (err) {
    res.status(500).json({ error: "Failed to toggle like", details: String(err) });
  }
});

router.delete("/photos/:id", async (req: Request, res: Response) => {
  const { deviceId } = req.body as { deviceId?: string };
  if (!deviceId) {
    res.status(400).json({ error: "deviceId required" });
    return;
  }

  try {
    const result = await pool.query(
      `DELETE FROM congress_photos WHERE id = $1 AND uploader_device_id = $2 RETURNING id`,
      [req.params.id, deviceId]
    );

    if (result.rows.length === 0) {
      res.status(403).json({ error: "Photo not found or you don't have permission to delete it" });
      return;
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete photo", details: String(err) });
  }
});

router.get("/storage/objects/*path", async (req: Request, res: Response) => {
  try {
    const raw = req.params.path;
    const wildcardPath = Array.isArray(raw) ? raw.join("/") : raw;
    const objectPath = `/objects/${wildcardPath}`;
    const objectFile = await objectStorageService.getObjectEntityFile(objectPath);
    const response = await objectStorageService.downloadObject(objectFile);
    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));
    if (response.body) {
      const nodeStream = Readable.fromWeb(response.body as ReadableStream<Uint8Array>);
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    if (error instanceof ObjectNotFoundError) {
      res.status(404).json({ error: "Object not found" });
      return;
    }
    res.status(500).json({ error: "Failed to serve object" });
  }
});

export default router;
