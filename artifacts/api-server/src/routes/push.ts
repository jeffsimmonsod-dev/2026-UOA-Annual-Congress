import { Router, type Request } from "express";
import { pool } from "../lib/db";
import { logger } from "../lib/logger";

const router = Router();

function getAdminPin(): string {
  const pin = process.env.ADMIN_PIN;
  if (!pin) throw new Error("ADMIN_PIN environment variable is not set");
  return pin;
}

function isAuthorizedHeader(req: Request): boolean {
  try {
    return req.headers["x-admin-pin"] === getAdminPin();
  } catch {
    return false;
  }
}

function isAuthorizedBody(adminPin: string | undefined): boolean {
  try {
    return adminPin === getAdminPin();
  } catch {
    return false;
  }
}

function isValidExpoToken(token: string): boolean {
  return /^ExponentPushToken\[.+\]$/.test(token);
}

async function ensureTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS congress_push_tokens (
      token      TEXT PRIMARY KEY,
      registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_seen     TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS congress_scheduled_announcements (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      body TEXT NOT NULL,
      scheduled_for TIMESTAMP NOT NULL,
      sent_at TIMESTAMP,
      failed_at TIMESTAMP,
      attempts INT NOT NULL DEFAULT 0,
      last_error TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
  await pool.query(`
    ALTER TABLE congress_scheduled_announcements
      ADD COLUMN IF NOT EXISTS failed_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS attempts INT NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS last_error TEXT
  `).catch(() => {});
  await pool.query(`
    ALTER TABLE congress_push_tokens
      ADD COLUMN IF NOT EXISTS conference_id INTEGER NOT NULL DEFAULT 1
  `).catch(() => {});
  await pool.query(`
    ALTER TABLE congress_scheduled_announcements
      ADD COLUMN IF NOT EXISTS conference_id INTEGER NOT NULL DEFAULT 1
  `).catch(() => {});
  await pool.query(`
    DELETE FROM congress_push_tokens
    WHERE token NOT LIKE 'ExponentPushToken[%'
  `).catch(() => {});
  await pool.query(`
    DO $$ BEGIN
      ALTER TABLE congress_push_tokens
        ADD CONSTRAINT fk_push_tokens_conf
        FOREIGN KEY (conference_id) REFERENCES conferences(id);
    EXCEPTION WHEN others THEN NULL; END $$;
  `).catch(() => {});
  await pool.query(`
    DO $$ BEGIN
      ALTER TABLE congress_scheduled_announcements
        ADD CONSTRAINT fk_sched_ann_conf
        FOREIGN KEY (conference_id) REFERENCES conferences(id);
    EXCEPTION WHEN others THEN NULL; END $$;
  `).catch(() => {});
}

ensureTables().catch((err) => logger.error({ err }, "push ensureTable error"));

const EXPO_PUSH_BATCH_SIZE = 100;
const MAX_SEND_ATTEMPTS = 3;

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

interface ExpoTicket {
  status: "ok" | "error";
  id?: string;
  message?: string;
  details?: { error?: string };
}

async function sendToAll(title: string, body: string, conferenceId: number) {
  const { rows } = await pool.query(
    `SELECT token FROM congress_push_tokens WHERE conference_id = $1`,
    [conferenceId]
  );
  const tokens = rows.map((r: { token: string }) => r.token);
  if (tokens.length === 0) return { sent: 0, failed: 0 };

  const batches = chunkArray(tokens, EXPO_PUSH_BATCH_SIZE);
  let totalSent = 0;
  let totalFailed = 0;
  const invalidTokens: string[] = [];

  for (const batch of batches) {
    const messages = batch.map((to) => ({
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

    if (!response.ok) {
      const errText = await response.text().catch(() => response.status.toString());
      throw new Error(`Expo push API error ${response.status}: ${errText}`);
    }

    const result = (await response.json()) as { data: ExpoTicket[] };
    const tickets: ExpoTicket[] = result.data ?? [];

    tickets.forEach((ticket, i) => {
      if (ticket.status === "ok") {
        totalSent++;
      } else {
        totalFailed++;
        const errCode = ticket.details?.error;
        if (errCode === "DeviceNotRegistered") {
          invalidTokens.push(batch[i]);
        }
      }
    });
  }

  if (invalidTokens.length > 0) {
    for (const token of invalidTokens) {
      await pool.query(
        `DELETE FROM congress_push_tokens WHERE token = $1 AND conference_id = $2`,
        [token, conferenceId]
      ).catch(() => {});
    }
  }

  return { sent: totalSent, failed: totalFailed };
}

const STALE_AFTER_MS = 60 * 60 * 1000;

async function processScheduled() {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM congress_scheduled_announcements
       WHERE sent_at IS NULL AND failed_at IS NULL AND scheduled_for <= NOW()
       ORDER BY scheduled_for ASC`
    );

    const now = Date.now();

    for (const row of rows) {
      const scheduledAt = new Date(row.scheduled_for).getTime();
      if (now - scheduledAt > STALE_AFTER_MS) {
        await pool.query(
          `UPDATE congress_scheduled_announcements
           SET failed_at = NOW(), last_error = $1
           WHERE id = $2`,
          [`Announcement expired: more than 1 hour past scheduled time (${row.scheduled_for})`, row.id]
        );
        logger.warn({ id: row.id, title: row.title }, "Scheduled announcement expired without sending");
        continue;
      }

      try {
        const result = await sendToAll(row.title, row.body, row.conference_id ?? 1);
        await pool.query(
          `UPDATE congress_scheduled_announcements SET sent_at = NOW(), attempts = attempts + 1 WHERE id = $1`,
          [row.id]
        );
        logger.info({ id: row.id, title: row.title, sent: result.sent, failed: result.failed }, "Scheduled announcement sent");
      } catch (err) {
        const attempts = (row.attempts ?? 0) + 1;
        const errMsg = String(err);
        if (attempts >= MAX_SEND_ATTEMPTS) {
          await pool.query(
            `UPDATE congress_scheduled_announcements
             SET attempts = $1, last_error = $2, failed_at = NOW()
             WHERE id = $3`,
            [attempts, errMsg, row.id]
          );
          logger.error({ id: row.id, attempts, errMsg }, "Scheduled announcement permanently failed");
        } else {
          await pool.query(
            `UPDATE congress_scheduled_announcements SET attempts = $1, last_error = $2 WHERE id = $3`,
            [attempts, errMsg, row.id]
          );
          logger.error({ id: row.id, attempt: attempts, errMsg }, "Scheduled announcement attempt failed");
        }
      }
    }
  } catch (err) {
    logger.error({ err }, "processScheduled error");
  }
}

setInterval(processScheduled, 30_000);

router.post("/push/register", async (req, res) => {
  const { token } = req.body as { token?: string };
  if (!token || typeof token !== "string") {
    res.status(400).json({ error: "token required" });
    return;
  }
  if (!isValidExpoToken(token)) {
    res.status(400).json({ error: "Invalid push token format" });
    return;
  }
  const conferenceId = req.conferenceId;
  await pool.query(
    `INSERT INTO congress_push_tokens (token, conference_id, last_seen)
     VALUES ($1, $2, NOW())
     ON CONFLICT (token) DO UPDATE SET last_seen = NOW(), conference_id = $2`,
    [token, conferenceId]
  );
  const { rows } = await pool.query(
    `SELECT COUNT(*) AS cnt FROM congress_push_tokens WHERE conference_id = $1`,
    [conferenceId]
  );
  res.json({ success: true, registered: parseInt(rows[0].cnt, 10) });
});

router.post("/push/send", async (req, res) => {
  const { title, body, adminPin } = req.body as {
    title?: string;
    body?: string;
    adminPin?: string;
  };

  if (!isAuthorizedBody(adminPin)) {
    res.status(401).json({ error: "Invalid admin PIN" });
    return;
  }

  if (!title || !body) {
    res.status(400).json({ error: "title and body required" });
    return;
  }

  try {
    const result = await sendToAll(title, body, req.conferenceId);
    res.json({
      success: true,
      ...result,
      message: result.sent === 0 ? "No registered devices" : `Sent to ${result.sent} device(s)`,
    });
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

  if (!isAuthorizedHeader(req)) {
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
    `INSERT INTO congress_scheduled_announcements (title, body, scheduled_for, conference_id)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [title, body, scheduledDate, req.conferenceId]
  );

  res.json({ success: true, announcement: rows[0] });
});

router.get("/push/scheduled", async (req, res) => {
  if (!isAuthorizedHeader(req)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { rows } = await pool.query(
    `SELECT * FROM congress_scheduled_announcements
     WHERE conference_id = $1
     ORDER BY scheduled_for ASC`,
    [req.conferenceId]
  );

  res.json({ announcements: rows });
});

router.delete("/push/scheduled/:id", async (req, res) => {
  if (!isAuthorizedHeader(req)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { rows } = await pool.query(
    `DELETE FROM congress_scheduled_announcements WHERE id = $1 AND conference_id = $2 AND sent_at IS NULL RETURNING id`,
    [req.params.id, req.conferenceId]
  );

  if (rows.length === 0) {
    res.status(404).json({ error: "Not found or already sent" });
    return;
  }

  res.json({ success: true });
});

router.get("/push/stats", async (req, res) => {
  const { rows } = await pool.query(
    `SELECT COUNT(*) AS cnt FROM congress_push_tokens WHERE conference_id = $1`,
    [req.conferenceId]
  );
  res.json({ registeredDevices: parseInt(rows[0].cnt, 10) });
});

export default router;
