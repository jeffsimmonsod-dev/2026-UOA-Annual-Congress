import crypto from "crypto";
import { Expo, type ExpoPushMessage, type ExpoPushTicket, type ExpoPushReceipt } from "expo-server-sdk";
import { pool } from "./db";
import { logger } from "./logger";
import { ensureConferencesTable } from "./ensureConferences";

/*
 * Push notifications via Expo's push service.
 *
 * Flow:
 *  1. sendToConference() sends to every registered device of one conference
 *     (chunked by expo-server-sdk), records a row in congress_push_sends and
 *     one row per accepted message in congress_push_tickets.
 *  2. Expo only "accepts" messages at send time. ~15 minutes later
 *     checkReceipts() asks Expo whether Apple/Google actually took them,
 *     records errors such as InvalidCredentials / MismatchSenderId, and removes
 *     devices that report DeviceNotRegistered.
 *  3. Scheduled announcements are sent by runScheduledJob(), which claims due
 *     rows in the database (FOR UPDATE SKIP LOCKED) so two server instances or
 *     two cron calls can never send the same announcement twice.
 */

type PushClient = Pick<Expo, "chunkPushNotifications" | "sendPushNotificationsAsync" | "getPushNotificationReceiptsAsync" | "chunkPushNotificationReceiptIds">;

let client: PushClient = new Expo(process.env.EXPO_ACCESS_TOKEN ? { accessToken: process.env.EXPO_ACCESS_TOKEN } : {});

/** Test hook: replace the Expo client. */
export function setPushClientForTests(c: PushClient): void {
  client = c;
}

export const isValidPushToken = (token: unknown): token is string =>
  typeof token === "string" && token.length <= 255 && Expo.isExpoPushToken(token);

/** Errors that mean the app's push credentials are misconfigured (not the device's fault). */
const CREDENTIAL_ERRORS = new Set(["InvalidCredentials", "MismatchSenderId"]);

const STALE_AFTER_MS = 60 * 60 * 1000;
const MAX_SEND_ATTEMPTS = 3;
const CLAIM_TIMEOUT_MINUTES = 10;
const RECEIPT_DELAY_MINUTES = 15;

let readyPromise: Promise<void> | null = null;

export function ensurePushTables(): Promise<void> {
  if (!readyPromise) {
    readyPromise = createTables().catch((err) => {
      readyPromise = null;
      throw err;
    });
  }
  return readyPromise;
}

async function createTables(): Promise<void> {
  await ensureConferencesTable().catch(() => {});

  await pool.query(`
    CREATE TABLE IF NOT EXISTS congress_push_tokens (
      token         TEXT NOT NULL,
      conference_id INTEGER NOT NULL DEFAULT 1,
      registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_seen     TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    ALTER TABLE congress_push_tokens ADD COLUMN IF NOT EXISTS conference_id INTEGER NOT NULL DEFAULT 1;
    ALTER TABLE congress_push_tokens ADD COLUMN IF NOT EXISTS platform TEXT;

    CREATE TABLE IF NOT EXISTS congress_scheduled_announcements (
      id            SERIAL PRIMARY KEY,
      title         VARCHAR(255) NOT NULL,
      body          TEXT NOT NULL,
      scheduled_for TIMESTAMPTZ NOT NULL,
      sent_at       TIMESTAMPTZ,
      failed_at     TIMESTAMPTZ,
      attempts      INT NOT NULL DEFAULT 0,
      last_error    TEXT,
      created_at    TIMESTAMPTZ DEFAULT NOW()
    );
    ALTER TABLE congress_scheduled_announcements
      ADD COLUMN IF NOT EXISTS failed_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS attempts INT NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS last_error TEXT,
      ADD COLUMN IF NOT EXISTS conference_id INTEGER NOT NULL DEFAULT 1,
      ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS claim_id TEXT,
      ADD COLUMN IF NOT EXISTS send_id INTEGER;

    CREATE TABLE IF NOT EXISTS congress_push_sends (
      id               SERIAL PRIMARY KEY,
      conference_id    INTEGER NOT NULL,
      title            VARCHAR(255) NOT NULL,
      source           VARCHAR(16) NOT NULL,
      announcement_id  INTEGER,
      attempted        INTEGER NOT NULL DEFAULT 0,
      accepted         INTEGER NOT NULL DEFAULT 0,
      failed           INTEGER NOT NULL DEFAULT 0,
      ticket_errors    JSONB NOT NULL DEFAULT '{}'::jsonb,
      delivered        INTEGER NOT NULL DEFAULT 0,
      receipt_failed   INTEGER NOT NULL DEFAULT 0,
      receipt_errors   JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS congress_push_tickets (
      id            SERIAL PRIMARY KEY,
      send_id       INTEGER NOT NULL REFERENCES congress_push_sends(id) ON DELETE CASCADE,
      conference_id INTEGER NOT NULL,
      ticket_id     TEXT NOT NULL,
      token         TEXT NOT NULL,
      status        VARCHAR(16) NOT NULL DEFAULT 'pending',
      error         TEXT,
      message       TEXT,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      checked_at    TIMESTAMPTZ
    );
    CREATE INDEX IF NOT EXISTS idx_push_tickets_pending ON congress_push_tickets(created_at) WHERE status = 'pending';
  `);

  // Older databases used a plain TIMESTAMP; values were written in UTC.
  await pool.query(`
    DO $$
    DECLARE col TEXT;
    BEGIN
      FOREACH col IN ARRAY ARRAY['scheduled_for', 'sent_at', 'failed_at', 'created_at'] LOOP
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = current_schema() AND table_name = 'congress_scheduled_announcements'
            AND column_name = col AND data_type = 'timestamp without time zone'
        ) THEN
          EXECUTE format(
            'ALTER TABLE congress_scheduled_announcements ALTER COLUMN %I TYPE TIMESTAMPTZ USING %I AT TIME ZONE ''UTC''',
            col, col);
        END IF;
      END LOOP;
    END $$;
  `);

  // Tokens used to be unique globally, so registering a device under another
  // conference silently moved it. Make (conference_id, token) the key instead.
  await pool.query(`
    DO $$ BEGIN
      IF EXISTS (
        SELECT 1 FROM pg_constraint c
        JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
        WHERE c.conrelid = 'congress_push_tokens'::regclass AND c.contype = 'p'
        GROUP BY c.conname HAVING COUNT(*) = 1
      ) THEN
        EXECUTE (
          SELECT format('ALTER TABLE congress_push_tokens DROP CONSTRAINT %I', conname)
          FROM pg_constraint WHERE conrelid = 'congress_push_tokens'::regclass AND contype = 'p'
        );
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conrelid = 'congress_push_tokens'::regclass AND contype = 'p'
      ) THEN
        ALTER TABLE congress_push_tokens ADD PRIMARY KEY (conference_id, token);
      END IF;
    END $$;
  `);

  for (const [table, name] of [["congress_push_tokens", "fk_push_tokens_conf"], ["congress_scheduled_announcements", "fk_sched_ann_conf"]]) {
    await pool.query(`
      DO $$ BEGIN
        ALTER TABLE ${table} ADD CONSTRAINT ${name} FOREIGN KEY (conference_id) REFERENCES conferences(id);
      EXCEPTION WHEN others THEN NULL; END $$;
    `).catch(() => {});
  }
}

function bump(map: Record<string, number>, key: string, by = 1): void {
  map[key] = (map[key] ?? 0) + by;
}

export interface SendResult {
  sendId: number | null;
  attempted: number;
  accepted: number;
  failed: number;
  errors: Record<string, number>;
}

/** Sends one notification to every registered device of a conference. */
export async function sendToConference(
  conferenceId: number,
  title: string,
  body: string,
  source: "manual" | "scheduled",
  announcementId: number | null = null,
): Promise<SendResult> {
  await ensurePushTables();
  const { rows } = await pool.query<{ token: string }>(
    `SELECT token FROM congress_push_tokens WHERE conference_id = $1`,
    [conferenceId],
  );
  const tokens = rows.map((r) => r.token).filter(isValidPushToken);
  const result: SendResult = { sendId: null, attempted: tokens.length, accepted: 0, failed: 0, errors: {} };
  if (tokens.length === 0) return result;

  const messages: ExpoPushMessage[] = tokens.map((to) => ({
    to,
    title,
    body,
    sound: "default",
    priority: "high",
    channelId: "default",
    data: { type: "announcement", conferenceId, timestamp: new Date().toISOString() },
  }));

  const accepted: { ticketId: string; token: string }[] = [];
  const unregistered: string[] = [];
  let requestFailures = 0;

  for (const chunk of client.chunkPushNotifications(messages)) {
    let tickets: ExpoPushTicket[];
    try {
      tickets = await client.sendPushNotificationsAsync(chunk);
    } catch (err) {
      requestFailures++;
      result.failed += chunk.length;
      bump(result.errors, "RequestFailed", chunk.length);
      logger.error({ err, conferenceId, chunkSize: chunk.length }, "Expo push request failed");
      continue;
    }
    tickets.forEach((ticket, i) => {
      const token = String(chunk[i]?.to);
      if (ticket.status === "ok") {
        result.accepted++;
        accepted.push({ ticketId: ticket.id, token });
      } else {
        result.failed++;
        const code = ticket.details?.error ?? "Unknown";
        bump(result.errors, code);
        if (code === "DeviceNotRegistered") unregistered.push(token);
        if (CREDENTIAL_ERRORS.has(code)) {
          logger.error({ conferenceId, code, message: ticket.message }, "Push credentials problem reported by Expo");
        }
      }
    });
  }

  const { rows: sendRows } = await pool.query<{ id: number }>(
    `INSERT INTO congress_push_sends (conference_id, title, source, announcement_id, attempted, accepted, failed, ticket_errors)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
    [conferenceId, title.slice(0, 255), source, announcementId, result.attempted, result.accepted, result.failed, JSON.stringify(result.errors)],
  );
  result.sendId = sendRows[0].id;

  if (accepted.length > 0) {
    await pool.query(
      `INSERT INTO congress_push_tickets (send_id, conference_id, ticket_id, token)
       SELECT $1, $2, t.ticket_id, t.token FROM UNNEST($3::text[], $4::text[]) AS t(ticket_id, token)`,
      [result.sendId, conferenceId, accepted.map((a) => a.ticketId), accepted.map((a) => a.token)],
    );
  }
  await removeTokens(conferenceId, unregistered);

  logger.info({ conferenceId, source, attempted: result.attempted, accepted: result.accepted, failed: result.failed, errors: result.errors }, "push send finished");

  if (result.accepted === 0 && requestFailures > 0) {
    throw new Error(`Expo push service unavailable (${requestFailures} request(s) failed)`);
  }
  return result;
}

async function removeTokens(conferenceId: number, tokens: string[]): Promise<void> {
  if (tokens.length === 0) return;
  await pool.query(
    `DELETE FROM congress_push_tokens WHERE conference_id = $1 AND token = ANY($2::text[])`,
    [conferenceId, tokens],
  ).catch((err) => logger.error({ err }, "failed to remove unregistered push tokens"));
}

export interface ReceiptSummary {
  checked: number;
  delivered: number;
  failed: number;
  expired: number;
  errors: Record<string, number>;
}

/**
 * Looks up Expo push receipts for tickets that are at least 15 minutes old.
 * Pass a conferenceId to limit the check to one conference.
 */
export async function checkReceipts(conferenceId: number | null = null, limit = 1000): Promise<ReceiptSummary> {
  await ensurePushTables();
  const summary: ReceiptSummary = { checked: 0, delivered: 0, failed: 0, expired: 0, errors: {} };

  // Receipts are kept by Expo for ~24 hours; give up on anything older.
  const expired = await pool.query(
    `UPDATE congress_push_tickets SET status = 'expired', checked_at = NOW()
     WHERE status = 'pending' AND created_at < NOW() - INTERVAL '24 hours'
       AND ($1::int IS NULL OR conference_id = $1)`,
    [conferenceId],
  );
  summary.expired = expired.rowCount ?? 0;

  // Claim a batch so concurrent runs never process the same tickets.
  const { rows } = await pool.query<{ id: number; ticket_id: string; token: string; conference_id: number; send_id: number }>(
    `UPDATE congress_push_tickets SET status = 'checking', checked_at = NOW()
     WHERE id IN (
       SELECT id FROM congress_push_tickets
       WHERE (status = 'pending' OR (status = 'checking' AND checked_at < NOW() - INTERVAL '10 minutes'))
         AND created_at < NOW() - make_interval(mins => $2)
         AND ($1::int IS NULL OR conference_id = $1)
       ORDER BY created_at ASC
       LIMIT $3
       FOR UPDATE SKIP LOCKED
     )
     RETURNING id, ticket_id, token, conference_id, send_id`,
    [conferenceId, RECEIPT_DELAY_MINUTES, limit],
  );
  if (rows.length === 0) return summary;

  const byTicket = new Map(rows.map((r) => [r.ticket_id, r]));
  const notReady: number[] = [];
  const perSend = new Map<number, { delivered: number; failed: number; errors: Record<string, number> }>();
  const unregistered = new Map<number, string[]>();

  for (const ids of client.chunkPushNotificationReceiptIds([...byTicket.keys()])) {
    let receipts: Record<string, ExpoPushReceipt>;
    try {
      receipts = await client.getPushNotificationReceiptsAsync(ids);
    } catch (err) {
      logger.error({ err }, "Expo receipt request failed");
      for (const id of ids) notReady.push(byTicket.get(id)!.id);
      continue;
    }
    for (const id of ids) {
      const row = byTicket.get(id)!;
      const receipt = receipts[id];
      if (!receipt) {
        notReady.push(row.id);
        continue;
      }
      summary.checked++;
      const agg = perSend.get(row.send_id) ?? { delivered: 0, failed: 0, errors: {} };
      perSend.set(row.send_id, agg);
      if (receipt.status === "ok") {
        summary.delivered++;
        agg.delivered++;
        await pool.query(`UPDATE congress_push_tickets SET status = 'ok' WHERE id = $1`, [row.id]);
      } else {
        const code = receipt.details?.error ?? "Unknown";
        summary.failed++;
        agg.failed++;
        bump(summary.errors, code);
        bump(agg.errors, code);
        await pool.query(
          `UPDATE congress_push_tickets SET status = 'error', error = $2, message = $3 WHERE id = $1`,
          [row.id, code, (receipt.message ?? "").slice(0, 1000)],
        );
        if (code === "DeviceNotRegistered") {
          unregistered.set(row.conference_id, [...(unregistered.get(row.conference_id) ?? []), row.token]);
        }
        if (CREDENTIAL_ERRORS.has(code)) {
          logger.error({ conferenceId: row.conference_id, code, message: receipt.message }, "Push credentials problem reported in receipt");
        }
      }
    }
  }

  if (notReady.length > 0) {
    await pool.query(
      `UPDATE congress_push_tickets SET status = 'pending', checked_at = NULL WHERE id = ANY($1::int[])`,
      [notReady],
    );
  }
  for (const [sendId, agg] of perSend) {
    await pool.query(
      `UPDATE congress_push_sends
       SET delivered = delivered + $2,
           receipt_failed = receipt_failed + $3,
           receipt_errors = (
             SELECT COALESCE(jsonb_object_agg(k, v), '{}'::jsonb) FROM (
               SELECT k, SUM(v::int) AS v FROM (
                 SELECT key AS k, value AS v FROM jsonb_each_text(receipt_errors)
                 UNION ALL
                 SELECT key, value FROM jsonb_each_text($4::jsonb)
               ) merged GROUP BY k
             ) totals
           )
       WHERE id = $1`,
      [sendId, agg.delivered, agg.failed, JSON.stringify(agg.errors)],
    );
  }
  for (const [confId, tokens] of unregistered) await removeTokens(confId, tokens);

  if (summary.checked > 0) logger.info({ ...summary }, "push receipts checked");
  return summary;
}

export interface ScheduledRunSummary {
  claimed: number;
  sent: number;
  failed: number;
  expired: number;
  retrying: number;
}

/**
 * Sends every due scheduled announcement exactly once. Safe to call from a
 * cron job, a Replit Scheduled Deployment, and/or several server instances at
 * the same time: due rows are claimed with FOR UPDATE SKIP LOCKED first.
 */
export async function runScheduledAnnouncements(): Promise<ScheduledRunSummary> {
  await ensurePushTables();
  const summary: ScheduledRunSummary = { claimed: 0, sent: 0, failed: 0, expired: 0, retrying: 0 };
  const claimId = crypto.randomUUID();

  const { rows } = await pool.query(
    `UPDATE congress_scheduled_announcements SET claimed_at = NOW(), claim_id = $1
     WHERE id IN (
       SELECT id FROM congress_scheduled_announcements
       WHERE sent_at IS NULL AND failed_at IS NULL AND scheduled_for <= NOW()
         AND (claimed_at IS NULL OR claimed_at < NOW() - make_interval(mins => $2))
       ORDER BY scheduled_for ASC
       LIMIT 20
       FOR UPDATE SKIP LOCKED
     )
     RETURNING *`,
    [claimId, CLAIM_TIMEOUT_MINUTES],
  );
  summary.claimed = rows.length;

  for (const row of rows) {
    const scheduledAt = new Date(row.scheduled_for).getTime();
    if (Date.now() - scheduledAt > STALE_AFTER_MS) {
      await pool.query(
        `UPDATE congress_scheduled_announcements SET failed_at = NOW(), last_error = $1, claimed_at = NULL
         WHERE id = $2 AND claim_id = $3`,
        ["Not sent: more than 1 hour past its scheduled time (is the scheduled job running?)", row.id, claimId],
      );
      logger.warn({ id: row.id }, "Scheduled announcement expired without sending");
      summary.expired++;
      continue;
    }

    try {
      const result = await sendToConference(row.conference_id ?? 1, row.title, row.body, "scheduled", row.id);
      const note = result.attempted === 0
        ? "No registered devices"
        : result.failed > 0 ? `${result.failed} of ${result.attempted} not accepted: ${JSON.stringify(result.errors)}` : null;
      await pool.query(
        `UPDATE congress_scheduled_announcements
         SET sent_at = NOW(), attempts = attempts + 1, send_id = $2, last_error = $3, claimed_at = NULL
         WHERE id = $1 AND claim_id = $4`,
        [row.id, result.sendId, note, claimId],
      );
      summary.sent++;
    } catch (err) {
      const attempts = (row.attempts ?? 0) + 1;
      const errMsg = err instanceof Error ? err.message : String(err);
      const permanent = attempts >= MAX_SEND_ATTEMPTS;
      await pool.query(
        `UPDATE congress_scheduled_announcements
         SET attempts = $1, last_error = $2, claimed_at = NULL, failed_at = CASE WHEN $3 THEN NOW() ELSE NULL END
         WHERE id = $4 AND claim_id = $5`,
        [attempts, errMsg.slice(0, 1000), permanent, row.id, claimId],
      );
      logger.error({ id: row.id, attempts, err }, permanent ? "Scheduled announcement permanently failed" : "Scheduled announcement attempt failed");
      if (permanent) summary.failed++;
      else summary.retrying++;
    }
  }
  return summary;
}

/** Optional in-process timer (PUSH_SCHEDULER_IN_PROCESS=true). Safe with multiple instances thanks to the DB claim. */
export function startInProcessScheduler(intervalMs = 30_000): void {
  const tick = async () => {
    try {
      await runScheduledAnnouncements();
      await checkReceipts();
    } catch (err) {
      logger.error({ err }, "in-process push scheduler error");
    }
  };
  setInterval(tick, intervalMs).unref();
  logger.info({ intervalMs }, "in-process push scheduler enabled");
}
