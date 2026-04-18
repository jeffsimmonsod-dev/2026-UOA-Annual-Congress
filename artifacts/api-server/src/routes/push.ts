import { Router } from "express";
import pg from "pg";

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const router = Router();

const pushTokens = new Set<string>();
const ADMIN_PIN = "Chanae2026!";

async function ensureTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS congress_scheduled_announcements (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      body TEXT NOT NULL,
      scheduled_for TIMESTAMP NOT NULL,
      sent_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
}

ensureTables().catch(console.error);

async function sendToAll(title: string, body: string) {
  const tokens = Array.from(pushTokens);
  if (tokens.length === 0) return { sent: 0 };

  const messages = tokens.map((to) => ({
    to,
    title,
    body,
    sound: "default",
    data: { type: "announcement", timestamp: new Date().toISOString() },
  }));

  const response = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "gzip, deflate",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(messages),
  });

  const result = await response.json();
  return { sent: tokens.length, result };
}

async function processScheduled() {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM congress_scheduled_announcements
       WHERE sent_at IS NULL AND scheduled_for <= NOW()
       ORDER BY scheduled_for ASC`
    );

    for (const row of rows) {
      try {
        await sendToAll(row.title, row.body);
        await pool.query(
          `UPDATE congress_scheduled_announcements SET sent_at = NOW() WHERE id = $1`,
          [row.id]
        );
        console.log(`Scheduled announcement sent: "${row.title}" (id=${row.id})`);
      } catch (err) {
        console.error(`Failed to send scheduled announcement id=${row.id}:`, err);
      }
    }
  } catch (err) {
    console.error("processScheduled error:", err);
  }
}

setInterval(processScheduled, 30_000);

router.post("/push/register", (req, res) => {
  const { token } = req.body as { token?: string };
  if (!token || typeof token !== "string") {
    res.status(400).json({ error: "token required" });
    return;
  }
  pushTokens.add(token);
  res.json({ success: true, registered: pushTokens.size });
});

router.post("/push/send", async (req, res) => {
  const { title, body, adminPin } = req.body as {
    title?: string;
    body?: string;
    adminPin?: string;
  };

  if (adminPin !== ADMIN_PIN) {
    res.status(401).json({ error: "Invalid admin PIN" });
    return;
  }

  if (!title || !body) {
    res.status(400).json({ error: "title and body required" });
    return;
  }

  try {
    const result = await sendToAll(title, body);
    res.json({ success: true, ...result, message: result.sent === 0 ? "No registered devices" : `Sent to ${result.sent} device(s)` });
  } catch (err) {
    res.status(500).json({ error: "Failed to send notifications", details: String(err) });
  }
});

router.post("/push/schedule", async (req, res) => {
  const { title, body, scheduledFor } = req.body as {
    title?: string;
    body?: string;
    scheduledFor?: string;
  };

  if (req.headers["x-admin-pin"] !== ADMIN_PIN) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  if (!title || !body || !scheduledFor) {
    res.status(400).json({ error: "title, body, and scheduledFor required" });
    return;
  }

  const scheduledDate = new Date(scheduledFor);
  if (isNaN(scheduledDate.getTime())) {
    res.status(400).json({ error: "Invalid scheduledFor date" });
    return;
  }

  if (scheduledDate <= new Date()) {
    res.status(400).json({ error: "scheduledFor must be in the future" });
    return;
  }

  const { rows } = await pool.query(
    `INSERT INTO congress_scheduled_announcements (title, body, scheduled_for)
     VALUES ($1, $2, $3) RETURNING *`,
    [title, body, scheduledDate]
  );

  res.json({ success: true, announcement: rows[0] });
});

router.get("/push/scheduled", async (req, res) => {
  if (req.headers["x-admin-pin"] !== ADMIN_PIN) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { rows } = await pool.query(
    `SELECT * FROM congress_scheduled_announcements
     ORDER BY scheduled_for ASC`
  );

  res.json({ announcements: rows });
});

router.delete("/push/scheduled/:id", async (req, res) => {
  if (req.headers["x-admin-pin"] !== ADMIN_PIN) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { rows } = await pool.query(
    `DELETE FROM congress_scheduled_announcements WHERE id = $1 AND sent_at IS NULL RETURNING id`,
    [req.params.id]
  );

  if (rows.length === 0) {
    res.status(404).json({ error: "Not found or already sent" });
    return;
  }

  res.json({ success: true });
});

router.get("/push/stats", (req, res) => {
  res.json({ registeredDevices: pushTokens.size });
});

export default router;
