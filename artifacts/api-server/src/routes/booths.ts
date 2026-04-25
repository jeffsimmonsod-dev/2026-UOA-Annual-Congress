import { Router, type Request, type Response } from "express";
import pg from "pg";
import crypto from "crypto";

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const router = Router();

const MAX_REGISTRATIONS_PER_IP_PER_HOUR = 500;
const SCAN_CODE_TTL_SECONDS = 30;

function getAdminPin(): string {
  const pin = process.env.ADMIN_PIN;
  if (!pin) throw new Error("ADMIN_PIN environment variable is not set");
  return pin;
}

function isAuthorized(req: Request): boolean {
  try {
    return req.headers["x-admin-pin"] === getAdminPin();
  } catch {
    return false;
  }
}

function clientIp(req: Request): string {
  return req.ip ?? req.socket.remoteAddress ?? "unknown";
}

async function ensureTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS congress_booths (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      company VARCHAR(255) NOT NULL,
      booth_number VARCHAR(50),
      description TEXT,
      secret_token VARCHAR(255) NOT NULL UNIQUE,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS congress_attendees (
      id SERIAL PRIMARY KEY,
      token VARCHAR(64) NOT NULL UNIQUE,
      name VARCHAR(255),
      email VARCHAR(255),
      email_consent BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS congress_booth_visits (
      id SERIAL PRIMARY KEY,
      booth_id INTEGER REFERENCES congress_booths(id) ON DELETE CASCADE,
      attendee_id INTEGER REFERENCES congress_attendees(id) ON DELETE CASCADE,
      attendee_name VARCHAR(255),
      attendee_email VARCHAR(255),
      email_consent BOOLEAN NOT NULL DEFAULT FALSE,
      visited_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(booth_id, attendee_id)
    );

    CREATE TABLE IF NOT EXISTS congress_checkin_nonces (
      nonce VARCHAR(64) PRIMARY KEY,
      attendee_id INTEGER NOT NULL REFERENCES congress_attendees(id) ON DELETE CASCADE,
      booth_id INTEGER NOT NULL REFERENCES congress_booths(id) ON DELETE CASCADE,
      expires_at TIMESTAMP NOT NULL,
      used BOOLEAN NOT NULL DEFAULT FALSE
    );

    CREATE TABLE IF NOT EXISTS congress_booth_scan_codes (
      code VARCHAR(64) PRIMARY KEY,
      booth_id INTEGER NOT NULL REFERENCES congress_booths(id) ON DELETE CASCADE,
      expires_at TIMESTAMP NOT NULL,
      used BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS congress_registration_rate (
      ip VARCHAR(64) NOT NULL,
      window_start TIMESTAMP NOT NULL,
      count INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (ip, window_start)
    );
  `);

  await pool.query(`
    ALTER TABLE congress_booth_visits
    ADD COLUMN IF NOT EXISTS attendee_id INTEGER REFERENCES congress_attendees(id) ON DELETE CASCADE;
  `);

  await pool.query(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'congress_booth_visits' AND column_name = 'device_id'
      ) THEN
        ALTER TABLE congress_booth_visits ALTER COLUMN device_id DROP NOT NULL;
      END IF;
    END $$;
  `);

  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'uq_booth_visits_booth_attendee'
      ) THEN
        ALTER TABLE congress_booth_visits
          ADD CONSTRAINT uq_booth_visits_booth_attendee UNIQUE (booth_id, attendee_id);
      END IF;
    END $$;
  `);

  await pool.query(`
    ALTER TABLE congress_booth_visits
    ADD COLUMN IF NOT EXISTS attendee_email VARCHAR(255);
  `);

  await pool.query(`
    ALTER TABLE congress_booth_visits
    ADD COLUMN IF NOT EXISTS email_consent BOOLEAN NOT NULL DEFAULT FALSE;
  `);
}

ensureTables().catch(console.error);

async function resolveAttendee(token: string): Promise<{ id: number } | null> {
  if (!token || typeof token !== "string" || token.length < 16 || token.length > 128) return null;
  const { rows } = await pool.query(
    "SELECT id FROM congress_attendees WHERE token = $1",
    [token]
  );
  return rows.length > 0 ? rows[0] : null;
}

async function checkAndIncrementRegistrationRate(ip: string): Promise<boolean> {
  const windowStart = new Date();
  windowStart.setMinutes(Math.floor(windowStart.getMinutes() / 60) * 60, 0, 0);

  const result = await pool.query(
    `INSERT INTO congress_registration_rate (ip, window_start, count)
     VALUES ($1, $2, 1)
     ON CONFLICT (ip, window_start)
     DO UPDATE SET count = congress_registration_rate.count + 1
     RETURNING count`,
    [ip, windowStart]
  );
  return result.rows[0].count <= MAX_REGISTRATIONS_PER_IP_PER_HOUR;
}

// POST /api/attendees/register — issue a server-generated attendee credential (rate-limited per IP)
router.post("/attendees/register", async (req: Request, res: Response) => {
  const ip = clientIp(req);
  const allowed = await checkAndIncrementRegistrationRate(ip);
  if (!allowed) {
    return res.status(429).json({ error: "Too many registrations from this network. Please try again later." });
  }

  const token = crypto.randomBytes(32).toString("hex");
  const { rows } = await pool.query(
    `INSERT INTO congress_attendees (token) VALUES ($1) RETURNING id`,
    [token]
  );
  res.json({ attendeeToken: token, attendeeId: rows[0].id });
});

// PATCH /api/attendees/profile — update name/email/consent for an existing attendee token
router.patch("/attendees/profile", async (req: Request, res: Response) => {
  const { attendeeToken, name, email, emailConsent } = req.body as {
    attendeeToken?: string;
    name?: string;
    email?: string;
    emailConsent?: boolean;
  };
  const attendee = await resolveAttendee(attendeeToken ?? "");
  if (!attendee) return res.status(403).json({ error: "Invalid attendee token" });

  await pool.query(
    `UPDATE congress_attendees SET name = $2, email = $3, email_consent = $4 WHERE id = $1`,
    [attendee.id, name || null, email || null, emailConsent === true]
  );
  res.json({ success: true });
});

// GET /api/booths?attendeeToken=xxx  — list all booths with visit status
router.get("/booths", async (req: Request, res: Response) => {
  const token = (req.query.attendeeToken as string) || "";
  const attendee = token ? await resolveAttendee(token) : null;
  const attendeeId = attendee?.id ?? null;

  const { rows } = await pool.query(
    `SELECT b.id, b.name, b.company, b.booth_number, b.description, b.created_at,
            (SELECT COUNT(*) FROM congress_booth_visits v WHERE v.booth_id = b.id AND v.attendee_id IS NOT NULL) AS visit_count,
            CASE WHEN $1::integer IS NOT NULL
              THEN EXISTS(SELECT 1 FROM congress_booth_visits v WHERE v.booth_id = b.id AND v.attendee_id = $1)
              ELSE FALSE
            END AS visited
     FROM congress_booths b
     ORDER BY b.booth_number ASC, b.name ASC`,
    [attendeeId]
  );
  const total = rows.length;
  const visitedCount = rows.filter((r) => r.visited).length;
  res.json({ booths: rows, total, visitedCount, complete: total > 0 && visitedCount === total });
});

// POST /api/booths/admin/:id/scan-code — issue a fresh short-lived one-time scan code for a booth (admin only)
router.post("/booths/admin/:id/scan-code", async (req: Request, res: Response) => {
  if (!isAuthorized(req)) {
    return res.status(403).json({ error: "Unauthorized" });
  }
  const boothId = parseInt(req.params.id, 10);
  if (isNaN(boothId)) return res.status(400).json({ error: "Invalid booth ID" });

  const boothRes = await pool.query("SELECT id FROM congress_booths WHERE id = $1", [boothId]);
  if (boothRes.rows.length === 0) return res.status(404).json({ error: "Booth not found" });

  const code = crypto.randomBytes(16).toString("hex");
  const expiresAt = new Date(Date.now() + SCAN_CODE_TTL_SECONDS * 1000);

  await pool.query(
    `INSERT INTO congress_booth_scan_codes (code, booth_id, expires_at) VALUES ($1, $2, $3)`,
    [code, boothId, expiresAt]
  );

  res.json({ code, boothId, expiresAt, ttlSeconds: SCAN_CODE_TTL_SECONDS });
});

// POST /api/booths/checkin-nonce — issue a booth-scoped, single-use nonce tied to a server attendee ID
router.post("/booths/checkin-nonce", async (req: Request, res: Response) => {
  const { attendeeToken, boothId } = req.body as { attendeeToken?: string; boothId?: number };

  const attendee = await resolveAttendee(attendeeToken ?? "");
  if (!attendee) return res.status(403).json({ error: "Invalid attendee token" });

  if (!boothId || isNaN(Number(boothId))) {
    return res.status(400).json({ error: "Missing boothId" });
  }

  const boothRes = await pool.query("SELECT id FROM congress_booths WHERE id = $1", [boothId]);
  if (boothRes.rows.length === 0) return res.status(404).json({ error: "Booth not found" });

  const nonce = crypto.randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  await pool.query(
    `INSERT INTO congress_checkin_nonces (nonce, attendee_id, booth_id, expires_at) VALUES ($1, $2, $3, $4)`,
    [nonce, attendee.id, boothId, expiresAt]
  );

  res.json({ nonce });
});

// POST /api/booths/checkin — record a booth visit using a short-lived server-issued scan code + attendee token + nonce
router.post("/booths/checkin", async (req: Request, res: Response) => {
  const { boothId, scanCode, attendeeToken, nonce, attendeeName, attendeeEmail, emailConsent } = req.body as {
    boothId: number;
    scanCode: string;
    attendeeToken: string;
    nonce: string;
    attendeeName?: string;
    attendeeEmail?: string;
    emailConsent?: boolean;
  };

  if (!boothId || !scanCode || !attendeeToken || !nonce) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const attendee = await resolveAttendee(attendeeToken);
  if (!attendee) return res.status(403).json({ error: "Invalid attendee token" });

  const nonceConsumed = await pool.query(
    `UPDATE congress_checkin_nonces
     SET used = TRUE
     WHERE nonce = $1
       AND attendee_id = $2
       AND booth_id = $3
       AND used = FALSE
       AND expires_at > NOW()
     RETURNING nonce`,
    [nonce, attendee.id, boothId]
  );
  if (nonceConsumed.rows.length === 0) {
    return res.status(403).json({ error: "Invalid, expired, or already-used check-in token" });
  }

  const scanConsumed = await pool.query(
    `UPDATE congress_booth_scan_codes
     SET used = TRUE
     WHERE code = $1
       AND booth_id = $2
       AND used = FALSE
       AND expires_at > NOW()
     RETURNING code`,
    [scanCode, boothId]
  );
  if (scanConsumed.rows.length === 0) {
    return res.status(403).json({ error: "Booth QR code has already been used or has expired. Ask staff to show the refreshed QR code." });
  }

  const boothRes = await pool.query(
    "SELECT id, name, company, booth_number FROM congress_booths WHERE id = $1",
    [boothId]
  );
  if (boothRes.rows.length === 0) {
    return res.status(404).json({ error: "Booth not found" });
  }
  const booth = boothRes.rows[0];

  const consent = emailConsent === true;
  const name = attendeeName || null;
  const email = attendeeEmail || null;

  try {
    await pool.query(
      `INSERT INTO congress_booth_visits (booth_id, attendee_id, attendee_name, attendee_email, email_consent)
       VALUES ($1, $2, $3, $4, $5)`,
      [boothId, attendee.id, name, email, consent]
    );
  } catch (err: any) {
    if (err.code === "23505") {
      await pool.query(
        `UPDATE congress_booth_visits
         SET attendee_name = $3, attendee_email = $4, email_consent = $5
         WHERE booth_id = $1 AND attendee_id = $2`,
        [boothId, attendee.id, name, email, consent]
      );
      return res.json({ success: true, alreadyVisited: true, booth: { id: booth.id, name: booth.name, company: booth.company } });
    }
    throw err;
  }

  res.json({ success: true, alreadyVisited: false, booth: { id: booth.id, name: booth.name, company: booth.company } });
});

// GET /api/booths/admin — admin view with tokens and visit counts
router.get("/booths/admin", async (req: Request, res: Response) => {
  if (!isAuthorized(req)) {
    return res.status(403).json({ error: "Unauthorized" });
  }
  const { rows } = await pool.query(
    `SELECT b.id, b.name, b.company, b.booth_number, b.description, b.created_at,
            (SELECT COUNT(*) FROM congress_booth_visits v WHERE v.booth_id = b.id AND v.attendee_id IS NOT NULL) AS visit_count
     FROM congress_booths b
     ORDER BY b.booth_number ASC, b.name ASC`
  );
  res.json({ booths: rows });
});

// GET /api/booths/admin/analytics — per-booth visitor details for sponsor reporting
router.get("/booths/admin/analytics", async (req: Request, res: Response) => {
  if (!isAuthorized(req)) {
    return res.status(403).json({ error: "Unauthorized" });
  }
  const { rows: booths } = await pool.query(
    `SELECT b.id, b.name, b.company, b.booth_number,
            (SELECT COUNT(*) FROM congress_booth_visits v WHERE v.booth_id = b.id AND v.attendee_id IS NOT NULL) AS visit_count
     FROM congress_booths b
     ORDER BY visit_count DESC, b.booth_number ASC`
  );
  const { rows: visits } = await pool.query(
    `SELECT v.booth_id, v.attendee_name,
            CASE WHEN v.email_consent = TRUE THEN v.attendee_email ELSE NULL END AS attendee_email,
            v.email_consent, v.attendee_id, v.visited_at
     FROM congress_booth_visits v
     WHERE v.attendee_id IS NOT NULL
     ORDER BY v.visited_at ASC`
  );
  const visitsByBooth: Record<number, typeof visits> = {};
  for (const v of visits) {
    if (!visitsByBooth[v.booth_id]) visitsByBooth[v.booth_id] = [];
    visitsByBooth[v.booth_id].push(v);
  }
  const result = booths.map((b) => ({
    ...b,
    visitors: visitsByBooth[b.id] ?? [],
  }));
  const totalVisits = visits.length;
  const uniqueAttendees = new Set(visits.map((v) => v.attendee_id)).size;
  res.json({ booths: result, totalVisits, uniqueAttendees });
});

// GET /api/booths/admin/entries — raffle entries (attendees that visited all booths)
router.get("/booths/admin/entries", async (req: Request, res: Response) => {
  if (!isAuthorized(req)) {
    return res.status(403).json({ error: "Unauthorized" });
  }
  const totalRes = await pool.query("SELECT COUNT(*) as count FROM congress_booths");
  const total = parseInt(totalRes.rows[0].count, 10);
  if (total === 0) return res.json({ entries: [], total: 0 });

  const { rows } = await pool.query(
    `SELECT v.attendee_id,
            MAX(v.attendee_name) AS attendee_name,
            COUNT(DISTINCT v.booth_id) AS booths_visited,
            MAX(v.visited_at) AS last_visit
     FROM congress_booth_visits v
     WHERE v.attendee_id IS NOT NULL
     GROUP BY v.attendee_id
     HAVING COUNT(DISTINCT v.booth_id) = $1
     ORDER BY last_visit ASC`,
    [total]
  );
  res.json({ entries: rows, total, raffleCount: rows.length });
});

// POST /api/booths — create booth (admin)
router.post("/booths", async (req: Request, res: Response) => {
  if (!isAuthorized(req)) {
    return res.status(403).json({ error: "Unauthorized" });
  }
  const { name, company, boothNumber, description } = req.body as {
    name: string;
    company: string;
    boothNumber?: string;
    description?: string;
  };
  if (!name || !company) {
    return res.status(400).json({ error: "name and company are required" });
  }
  const secretToken = crypto.randomBytes(16).toString("hex");
  const { rows } = await pool.query(
    `INSERT INTO congress_booths (name, company, booth_number, description, secret_token)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [name, company, boothNumber || null, description || null, secretToken]
  );
  res.json({ booth: rows[0] });
});

// DELETE /api/booths/:id — delete booth (admin)
router.delete("/booths/:id", async (req: Request, res: Response) => {
  if (!isAuthorized(req)) {
    return res.status(403).json({ error: "Unauthorized" });
  }
  await pool.query("DELETE FROM congress_booths WHERE id = $1", [req.params.id]);
  res.json({ success: true });
});

export default router;
