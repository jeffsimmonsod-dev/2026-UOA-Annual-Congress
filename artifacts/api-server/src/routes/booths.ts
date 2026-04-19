import { Router, type Request, type Response } from "express";
import pg from "pg";
import crypto from "crypto";

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const router = Router();

const ADMIN_PIN = "Chanae2026!";

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
    CREATE TABLE IF NOT EXISTS congress_booth_visits (
      id SERIAL PRIMARY KEY,
      booth_id INTEGER REFERENCES congress_booths(id) ON DELETE CASCADE,
      device_id VARCHAR(255) NOT NULL,
      attendee_name VARCHAR(255),
      visited_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(booth_id, device_id)
    );
  `);
}

ensureTables().catch(console.error);

// GET /api/booths?deviceId=xxx  — list all booths with visit status
router.get("/booths", async (req: Request, res: Response) => {
  const deviceId = (req.query.deviceId as string) || "";
  const { rows } = await pool.query(
    `SELECT b.id, b.name, b.company, b.booth_number, b.description, b.created_at,
            (SELECT COUNT(*) FROM congress_booth_visits v WHERE v.booth_id = b.id) AS visit_count,
            EXISTS(SELECT 1 FROM congress_booth_visits v WHERE v.booth_id = b.id AND v.device_id = $1) AS visited
     FROM congress_booths b
     ORDER BY b.booth_number ASC, b.name ASC`,
    [deviceId]
  );
  const total = rows.length;
  const visitedCount = rows.filter((r) => r.visited).length;
  res.json({ booths: rows, total, visitedCount, complete: total > 0 && visitedCount === total });
});

// POST /api/booths/checkin — scan QR and check in
router.post("/booths/checkin", async (req: Request, res: Response) => {
  const { boothId, secretToken, deviceId, attendeeName } = req.body as {
    boothId: number;
    secretToken: string;
    deviceId: string;
    attendeeName?: string;
  };

  if (!boothId || !secretToken || !deviceId) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const boothRes = await pool.query(
    "SELECT id, name, company, booth_number, secret_token FROM congress_booths WHERE id = $1",
    [boothId]
  );
  if (boothRes.rows.length === 0) {
    return res.status(404).json({ error: "Booth not found" });
  }
  const booth = boothRes.rows[0];

  if (booth.secret_token !== secretToken) {
    return res.status(403).json({ error: "Invalid QR code" });
  }

  try {
    await pool.query(
      `INSERT INTO congress_booth_visits (booth_id, device_id, attendee_name)
       VALUES ($1, $2, $3)`,
      [boothId, deviceId, attendeeName || null]
    );
  } catch (err: any) {
    if (err.code === "23505") {
      return res.json({ success: true, alreadyVisited: true, booth: { id: booth.id, name: booth.name, company: booth.company } });
    }
    throw err;
  }

  res.json({ success: true, alreadyVisited: false, booth: { id: booth.id, name: booth.name, company: booth.company } });
});

// GET /api/booths/admin — admin view with tokens and visit counts
router.get("/booths/admin", async (req: Request, res: Response) => {
  if (req.headers["x-admin-pin"] !== ADMIN_PIN) {
    return res.status(403).json({ error: "Unauthorized" });
  }
  const { rows } = await pool.query(
    `SELECT b.*, 
            (SELECT COUNT(*) FROM congress_booth_visits v WHERE v.booth_id = b.id) AS visit_count
     FROM congress_booths b
     ORDER BY b.booth_number ASC, b.name ASC`
  );
  res.json({ booths: rows });
});

// GET /api/booths/admin/analytics — per-booth visitor details for sponsor reporting
router.get("/booths/admin/analytics", async (req: Request, res: Response) => {
  if (req.headers["x-admin-pin"] !== ADMIN_PIN) {
    return res.status(403).json({ error: "Unauthorized" });
  }
  const { rows: booths } = await pool.query(
    `SELECT b.id, b.name, b.company, b.booth_number,
            (SELECT COUNT(*) FROM congress_booth_visits v WHERE v.booth_id = b.id) AS visit_count
     FROM congress_booths b
     ORDER BY visit_count DESC, b.booth_number ASC`
  );
  const { rows: visits } = await pool.query(
    `SELECT v.booth_id, v.attendee_name, v.device_id, v.visited_at
     FROM congress_booth_visits v
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
  const uniqueAttendees = new Set(visits.map((v) => v.device_id)).size;
  res.json({ booths: result, totalVisits, uniqueAttendees });
});

// GET /api/booths/admin/entries — raffle entries (devices that visited all booths)
router.get("/booths/admin/entries", async (req: Request, res: Response) => {
  if (req.headers["x-admin-pin"] !== ADMIN_PIN) {
    return res.status(403).json({ error: "Unauthorized" });
  }
  const totalRes = await pool.query("SELECT COUNT(*) as count FROM congress_booths");
  const total = parseInt(totalRes.rows[0].count, 10);
  if (total === 0) return res.json({ entries: [], total: 0 });

  const { rows } = await pool.query(
    `SELECT v.device_id, 
            MAX(v.attendee_name) AS attendee_name,
            COUNT(DISTINCT v.booth_id) AS booths_visited,
            MAX(v.visited_at) AS last_visit
     FROM congress_booth_visits v
     GROUP BY v.device_id
     HAVING COUNT(DISTINCT v.booth_id) = $1
     ORDER BY last_visit ASC`,
    [total]
  );
  res.json({ entries: rows, total, raffleCount: rows.length });
});

// POST /api/booths — create booth (admin)
router.post("/booths", async (req: Request, res: Response) => {
  if (req.headers["x-admin-pin"] !== ADMIN_PIN) {
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
  if (req.headers["x-admin-pin"] !== ADMIN_PIN) {
    return res.status(403).json({ error: "Unauthorized" });
  }
  await pool.query("DELETE FROM congress_booths WHERE id = $1", [req.params.id]);
  res.json({ success: true });
});

export default router;
