import { Router, type Request, type Response } from "express";
import { pool } from "../lib/db";
import { logger } from "../lib/logger";
import { checkAdminPin, clientIp, requireAdmin, safeEqual, sendAdminFailure } from "../lib/adminAuth";
import { SlidingWindowLimiter } from "../lib/rateLimit";
import {
  checkReceipts,
  ensurePushTables,
  isValidPushToken,
  runScheduledAnnouncements,
  sendToConference,
  startInProcessScheduler,
} from "../lib/push";

const router = Router();

ensurePushTables().catch((err) => logger.error({ err }, "push ensureTables error"));

// Scheduled announcements are sent by POST /api/push/run-scheduled (called by a
// cron job / Replit Scheduled Deployment). The old always-on timer is opt-in.
if (process.env.PUSH_SCHEDULER_IN_PROCESS === "true") startInProcessScheduler();

const registerLimiter = new SlidingWindowLimiter(120, 10 * 60 * 1000);
setInterval(() => registerLimiter.prune(), 5 * 60 * 1000).unref();

async function conferenceExists(id: number): Promise<boolean> {
  const { rows } = await pool.query(`SELECT 1 FROM conferences WHERE id = $1`, [id]);
  return rows.length > 0;
}

router.post("/push/register", async (req, res) => {
  const { token, platform } = req.body as { token?: unknown; platform?: unknown };
  if (!token || typeof token !== "string") {
    res.status(400).json({ error: "token required" });
    return;
  }
  if (!isValidPushToken(token)) {
    res.status(400).json({ error: "Invalid push token format" });
    return;
  }
  if (!registerLimiter.tryHit(`${req.conferenceId}:${clientIp(req)}`)) {
    res.status(429).json({ error: "Too many registrations from this network. Please try again later." });
    return;
  }
  try {
    await ensurePushTables();
    const conferenceId = req.conferenceId;
    if (!(await conferenceExists(conferenceId))) {
      res.status(404).json({ error: "Conference not found" });
      return;
    }
    // A device is registered per conference: registering for one conference no
    // longer silently removes it from another.
    await pool.query(
      `INSERT INTO congress_push_tokens (token, conference_id, platform, last_seen)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (conference_id, token) DO UPDATE SET last_seen = NOW(), platform = COALESCE(EXCLUDED.platform, congress_push_tokens.platform)`,
      [token, conferenceId, platform === "ios" || platform === "android" ? platform : null],
    );
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "push register error");
    res.status(500).json({ error: "Could not register device" });
  }
});

router.post("/push/send", async (req, res) => {
  const { title, body, adminPin } = req.body as {
    title?: string;
    body?: string;
    adminPin?: string;
  };

  // Same header-based auth as every other admin route. The body field is still
  // accepted (through the same lockout + constant-time check) only so admin
  // clients running an older build keep working until they update.
  const headerPin = req.headers["x-admin-pin"];
  const auth = checkAdminPin(clientIp(req), headerPin !== undefined ? headerPin : adminPin);
  if (!auth.ok) {
    sendAdminFailure(res, auth);
    return;
  }

  if (typeof title !== "string" || typeof body !== "string" || !title.trim() || !body.trim()) {
    res.status(400).json({ error: "title and body required" });
    return;
  }

  try {
    const result = await sendToConference(req.conferenceId, title.trim(), body.trim(), "manual");
    if (result.attempted === 0) {
      res.json({
        success: false,
        sent: 0,
        failed: 0,
        attempted: 0,
        message: "No devices are registered for this conference yet, so nothing was sent.",
      });
      return;
    }
    const reasons = Object.entries(result.errors).map(([code, n]) => `${code}: ${n}`).join(", ");
    const warning = result.failed > 0
      ? `${result.failed} of ${result.attempted} device(s) could not be sent to (${reasons}).`
      : undefined;
    res.json({
      success: result.accepted > 0,
      sent: result.accepted,
      failed: result.failed,
      attempted: result.attempted,
      errors: result.errors,
      sendId: result.sendId,
      warning,
      message: result.accepted > 0
        ? `Accepted for delivery to ${result.accepted} of ${result.attempted} device(s). Final delivery is confirmed by receipts about 15 minutes later.`
        : `Not sent: ${reasons || "no device accepted the message"}.`,
    });
  } catch (err) {
    req.log.error({ err }, "push/send error");
    res.status(502).json({ success: false, error: "Could not reach the push notification service. Nothing was sent; please try again." });
  }
});

router.post("/push/schedule", async (req, res) => {
  const { title, body, scheduledFor } = req.body as {
    title?: string;
    body?: string;
    scheduledFor?: string;
  };

  if (!requireAdmin(req, res)) return;

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

  try {
    await ensurePushTables();
    const { rows } = await pool.query(
      `INSERT INTO congress_scheduled_announcements (title, body, scheduled_for, conference_id)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [title, body, scheduledDate.toISOString(), req.conferenceId],
    );
    res.json({ success: true, announcement: rows[0] });
  } catch (err) {
    req.log.error({ err }, "push schedule error");
    res.status(500).json({ error: "Could not schedule announcement" });
  }
});

router.get("/push/scheduled", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    await ensurePushTables();
    const { rows } = await pool.query(
      `SELECT a.id, a.title, a.body, a.scheduled_for, a.sent_at, a.failed_at, a.attempts, a.last_error,
              a.created_at, a.conference_id,
              s.attempted, s.accepted, s.failed, s.delivered, s.receipt_failed
       FROM congress_scheduled_announcements a
       LEFT JOIN congress_push_sends s ON s.id = a.send_id
       WHERE a.conference_id = $1
       ORDER BY a.scheduled_for ASC`,
      [req.conferenceId],
    );
    res.json({ announcements: rows });
  } catch (err) {
    req.log.error({ err }, "push scheduled list error");
    res.status(500).json({ error: "Server error" });
  }
});

router.delete("/push/scheduled/:id", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const { rows } = await pool.query(
      `DELETE FROM congress_scheduled_announcements
       WHERE id = $1 AND conference_id = $2 AND sent_at IS NULL AND claimed_at IS NULL RETURNING id`,
      [String(req.params.id), req.conferenceId],
    );
    if (rows.length === 0) {
      res.status(404).json({ error: "Not found, already sent, or being sent right now" });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "push scheduled delete error");
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/push/stats — registered device count (admin only)
router.get("/push/stats", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    await ensurePushTables();
    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS cnt,
              COUNT(*) FILTER (WHERE platform = 'ios')::int AS ios,
              COUNT(*) FILTER (WHERE platform = 'android')::int AS android
       FROM congress_push_tokens WHERE conference_id = $1`,
      [req.conferenceId],
    );
    res.json({ registeredDevices: rows[0].cnt, ios: rows[0].ios, android: rows[0].android });
  } catch (err) {
    req.log.error({ err }, "push stats error");
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/push/history — recent sends with acceptance and delivery-receipt counts (admin only)
router.get("/push/history", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    await ensurePushTables();
    const { rows } = await pool.query(
      `SELECT id, title, source, announcement_id, attempted, accepted, failed, ticket_errors,
              delivered, receipt_failed, receipt_errors, created_at,
              (SELECT COUNT(*)::int FROM congress_push_tickets t WHERE t.send_id = s.id AND t.status IN ('pending', 'checking')) AS awaiting_receipts
       FROM congress_push_sends s
       WHERE conference_id = $1
       ORDER BY created_at DESC
       LIMIT 20`,
      [req.conferenceId],
    );
    res.json({ sends: rows });
  } catch (err) {
    req.log.error({ err }, "push history error");
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/push/check-receipts — check delivery receipts now for this conference (admin only)
router.post("/push/check-receipts", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const summary = await checkReceipts(req.conferenceId);
    res.json({ success: true, ...summary });
  } catch (err) {
    req.log.error({ err }, "push receipts error");
    res.status(502).json({ success: false, error: "Could not check receipts right now" });
  }
});

function cronAuthorized(req: Request, res: Response): boolean {
  const secret = process.env.PUSH_CRON_SECRET;
  const supplied = req.headers["x-cron-secret"];
  if (secret && secret.length >= 24 && typeof supplied === "string") {
    if (safeEqual(supplied, secret)) return true;
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  // Fall back to the admin PIN (useful for manual runs).
  return requireAdmin(req, res);
}

// POST /api/push/run-scheduled — send due scheduled announcements (all conferences)
// and check delivery receipts. Call every minute from a cron job or a Replit
// Scheduled Deployment with header `x-cron-secret: $PUSH_CRON_SECRET`.
router.post("/push/run-scheduled", async (req, res) => {
  if (!cronAuthorized(req, res)) return;
  try {
    const scheduled = await runScheduledAnnouncements();
    const receipts = await checkReceipts();
    res.json({ success: true, scheduled, receipts });
  } catch (err) {
    req.log.error({ err }, "push run-scheduled error");
    res.status(500).json({ success: false, error: "Scheduled run failed" });
  }
});

export default router;
