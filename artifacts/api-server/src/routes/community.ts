import { Router, type IRouter, type Request, type Response } from "express";
import { pool } from "../lib/db";
import type { PoolClient } from "pg";
import { readOperatorSession, type OperatorSession } from "../lib/operator-session";
import { requireAdmin } from "../lib/adminAuth";

const router: IRouter = Router();
const validTypes = new Set(["photo", "comment", "discussion", "reply"]);
const writeWindows = new Map<string, number[]>();
const reportWindows = new Map<string, number[]>();

type CommunityType = "photo" | "comment" | "discussion" | "reply";

function limited(map: Map<string, number[]>, key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const current = (map.get(key) ?? []).filter((at) => now - at < windowMs);
  if (current.length >= max) return true;
  current.push(now);
  map.set(key, current);
  return false;
}

function cleanString(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const result = value.trim();
  return result.length > 0 && result.length <= max ? result : null;
}

async function validSession(req: Request, res: Response, token: unknown): Promise<string | null> {
  if (typeof token !== "string" || token.length < 1 || token.length > 128) {
    res.status(400).json({ error: "A valid sessionToken is required" });
    return null;
  }
  const found = await pool.query(
    "SELECT 1 FROM congress_sessions WHERE session_token = $1 AND conference_id = $2 LIMIT 1",
    [token, req.conferenceId],
  );
  if (found.rowCount === 0) {
    res.status(403).json({ error: "Invalid session token for this conference" });
    return null;
  }
  return token;
}

async function profileFor(req: Request, token: string): Promise<{ name: string; restricted: boolean } | null> {
  const result = await pool.query(
    "SELECT name, restricted FROM community_profiles WHERE conference_id = $1 AND session_token = $2",
    [req.conferenceId, token],
  );
  return result.rows[0] ?? null;
}

function writeLimited(req: Request, token: string): boolean {
  return limited(writeWindows, `${req.conferenceId}:${token}`, 20, 10 * 60_000);
}


type Decision = { previousValue: string | null; newValue: string | null };

function decisionReason(value: unknown): string | null {
  return cleanString(value, 500);
}

function csvCell(value: unknown): string {
  let text = value == null ? "" : String(value);
  // A quoted CSV field can still be interpreted as a spreadsheet formula.
  if (/^\s*[=+\-@]/u.test(text) || /^[\t\r\n]/u.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

// The state change and its audit row either both commit or neither does. A
// repeated request with no state change is successful, but is not a decision.
async function recordDecision(
  req: Request,
  operator: OperatorSession,
  action: string,
  targetType: string,
  targetId: string,
  reason: string,
  change: (client: PoolClient) => Promise<Decision | null>,
): Promise<Decision | null> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const decision = await change(client);
    if (decision && decision.previousValue !== decision.newValue) {
      await client.query(
        `INSERT INTO community_admin_actions
         (conference_id, action, target_type, target_id, previous_value, new_value, reason, actor_label, actor_session_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [req.conferenceId, action, targetType, targetId, decision.previousValue, decision.newValue, reason, operator.name, operator.id],
      );
    }
    await client.query("COMMIT");
    return decision;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

function pageSize(value: unknown, fallback = 50): number {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? Math.min(number, 100) : fallback;
}

function positiveIntegerId(value: unknown): number | null {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

async function contentTarget(
  conferenceId: number,
  type: CommunityType,
  targetId: string,
): Promise<{ table: string; ownerColumn: string; idColumn: string; owner: string } | null> {
  const definitions: Record<CommunityType, { table: string; idColumn: string; ownerColumn: string; owner: string }> = {
    photo: { table: "congress_photos", idColumn: "id", ownerColumn: "uploader_device_id", owner: "sessionToken" },
    comment: { table: "community_photo_comments", idColumn: "id", ownerColumn: "session_token", owner: "sessionToken" },
    discussion: { table: "community_discussions", idColumn: "id", ownerColumn: "session_token", owner: "sessionToken" },
    reply: { table: "community_replies", idColumn: "id", ownerColumn: "session_token", owner: "sessionToken" },
  };
  const def = definitions[type];
  const found = await pool.query(
    `SELECT ${def.ownerColumn} AS owner FROM ${def.table} WHERE ${def.idColumn} = $1 AND conference_id = $2`,
    [targetId, conferenceId],
  );
  return found.rows[0] ? { ...def, owner: found.rows[0].owner } : null;
}

async function publicTargetAllowed(req: Request, type: CommunityType, id: string): Promise<boolean> {
  const def: Record<CommunityType, { table: string; id: string; hidden: boolean }> = {
    photo: { table: "congress_photos", id: "id", hidden: true },
    comment: { table: "community_photo_comments", id: "id", hidden: true },
    discussion: { table: "community_discussions", id: "id", hidden: true },
    reply: { table: "community_replies", id: "id", hidden: true },
  };
  const target = def[type];
  const found = await pool.query(
    `SELECT 1 FROM ${target.table} x
     WHERE x.${target.id}::text = $1 AND x.conference_id = $2 ${target.hidden ? "AND x.hidden = false" : ""}
    `,
    [id, req.conferenceId],
  );
  return found.rows.length > 0;
}

router.post("/community/profile", async (req: Request, res: Response): Promise<void> => {
  try {
    const token = await validSession(req, res, req.body?.sessionToken);
    if (!token) return;
    const name = cleanString(req.body?.name, 50);
    if (!name) { res.status(400).json({ error: "name must be 1-50 characters" }); return; }
    const result = await pool.query(
      `INSERT INTO community_profiles (conference_id, session_token, name)
       VALUES ($1, $2, $3)
       ON CONFLICT (conference_id, session_token)
       DO UPDATE SET name = EXCLUDED.name, updated_at = NOW()
       RETURNING name, restricted`,
      [req.conferenceId, token, name],
    );
    res.json(result.rows[0]);
  } catch (err) {
    req.log.error({ err }, "community profile update failed");
    res.status(500).json({ error: "Failed to save community profile" });
  }
});

router.get("/community/discussions", async (req: Request, res: Response): Promise<void> => {
  try {
    const token = await validSession(req, res, req.query.sessionToken);
    if (!token) return;
    const limit = pageSize(req.query.limit);
    const offset = Math.max(0, Number.parseInt(String(req.query.offset ?? "0"), 10) || 0);
    const result = await pool.query(
      `SELECT d.id, d.title, d.body, p.name AS "authorName", COUNT(r.id)::int AS "replyCount", d.created_at AS "createdAt"
       FROM community_discussions d
       JOIN community_profiles p ON p.conference_id = d.conference_id AND p.session_token = d.session_token
       LEFT JOIN community_replies r ON r.discussion_id = d.id AND r.hidden = false
       WHERE d.conference_id = $1 AND d.hidden = false
       GROUP BY d.id, p.name ORDER BY d.created_at DESC, d.id DESC LIMIT $2 OFFSET $3`,
      [req.conferenceId, limit, offset],
    );
    res.json({ discussions: result.rows });
  } catch (err) {
    req.log.error({ err }, "community discussions fetch failed");
    res.status(500).json({ error: "Failed to fetch discussions" });
  }
});

router.get("/community/discussions/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const token = await validSession(req, res, req.query.sessionToken);
    if (!token) return;
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const numericId = positiveIntegerId(id);
    if (numericId === null) { res.status(400).json({ error: "Discussion id must be a positive integer" }); return; }
    const discussion = await pool.query(
      `SELECT d.id, d.title, d.body, p.name AS "authorName", (d.session_token = $3) AS "canDelete",
              (SELECT COUNT(*)::int FROM community_replies rc WHERE rc.discussion_id = d.id AND rc.hidden = false) AS "replyCount",
              d.created_at AS "createdAt"
       FROM community_discussions d
       JOIN community_profiles p ON p.conference_id = d.conference_id AND p.session_token = d.session_token
       WHERE d.id = $1 AND d.conference_id = $2 AND d.hidden = false`,
      [numericId, req.conferenceId, token],
    );
    if (!discussion.rows[0]) { res.status(404).json({ error: "Discussion not found" }); return; }
    const replies = await pool.query(
      `SELECT r.id, r.body, p.name AS "authorName", r.created_at AS "createdAt", (r.session_token = $3) AS "canDelete"
       FROM community_replies r
       JOIN community_profiles p ON p.conference_id = r.conference_id AND p.session_token = r.session_token
       WHERE r.discussion_id = $1 AND r.conference_id = $2 AND r.hidden = false
       ORDER BY r.created_at, r.id LIMIT 100`,
      [numericId, req.conferenceId, token],
    );
    res.json({ discussion: { ...discussion.rows[0], replies: replies.rows } });
  } catch (err) {
    req.log.error({ err }, "community discussion fetch failed");
    res.status(500).json({ error: "Failed to fetch discussion" });
  }
});

router.post("/community/discussions", async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionToken, name, title, body } = req.body ?? {};
    const token = await validSession(req, res, sessionToken);
    if (!token) return;
    const cleanName = cleanString(name, 50);
    const cleanTitle = cleanString(title, 120);
    const cleanBody = cleanString(body, 5000);
    if (!cleanName || !cleanTitle || !cleanBody) { res.status(400).json({ error: "name (1-50), title (1-120), and body (1-5000) are required" }); return; }
    if (writeLimited(req, token)) { res.status(429).json({ error: "Too many community posts; please try again later" }); return; }
    await pool.query(
      `INSERT INTO community_profiles (conference_id, session_token, name) VALUES ($1, $2, $3)
       ON CONFLICT (conference_id, session_token) DO UPDATE SET name = EXCLUDED.name, updated_at = NOW()`,
      [req.conferenceId, token, cleanName],
    );
    if ((await profileFor(req, token))?.restricted) { res.status(403).json({ error: "Community posting is restricted" }); return; }
    const result = await pool.query(
      `INSERT INTO community_discussions (conference_id, session_token, title, body)
       VALUES ($1, $2, $3, $4) RETURNING id, title, body, created_at AS "createdAt"`,
      [req.conferenceId, token, cleanTitle, cleanBody],
    );
    res.status(201).json({ discussion: { ...result.rows[0], authorName: cleanName, replyCount: 0 } });
  } catch (err) {
    req.log.error({ err }, "community discussion create failed");
    res.status(500).json({ error: "Failed to create discussion" });
  }
});

router.post("/community/discussions/:id/replies", async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionToken, name, body } = req.body ?? {};
    const token = await validSession(req, res, sessionToken);
    if (!token) return;
    const cleanName = cleanString(name, 50);
    const cleanBody = cleanString(body, 3000);
    if (!cleanName || !cleanBody) { res.status(400).json({ error: "name (1-50) and body (1-3000) are required" }); return; }
    if (writeLimited(req, token)) { res.status(429).json({ error: "Too many community posts; please try again later" }); return; }
    const parentId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const numericParentId = positiveIntegerId(parentId);
    if (numericParentId === null) { res.status(400).json({ error: "Discussion id must be a positive integer" }); return; }
    const visible = await pool.query(
      `SELECT 1 FROM community_discussions d WHERE d.id = $1 AND d.conference_id = $2 AND d.hidden = false`,
      [numericParentId, req.conferenceId],
    );
    if (!visible.rowCount) { res.status(404).json({ error: "Discussion not found" }); return; }
    await pool.query(
      `INSERT INTO community_profiles (conference_id, session_token, name) VALUES ($1, $2, $3)
       ON CONFLICT (conference_id, session_token) DO UPDATE SET name = EXCLUDED.name, updated_at = NOW()`,
      [req.conferenceId, token, cleanName],
    );
    if ((await profileFor(req, token))?.restricted) { res.status(403).json({ error: "Community posting is restricted" }); return; }
    const result = await pool.query(
      `INSERT INTO community_replies (conference_id, discussion_id, session_token, body)
       VALUES ($1, $2, $3, $4) RETURNING id, body, created_at AS "createdAt"`,
      [req.conferenceId, numericParentId, token, cleanBody],
    );
    res.status(201).json({ reply: { ...result.rows[0], authorName: cleanName, canDelete: true } });
  } catch (err) {
    req.log.error({ err }, "community reply create failed");
    res.status(500).json({ error: "Failed to create reply" });
  }
});

router.get("/community/photos/:id/comments", async (req: Request, res: Response): Promise<void> => {
  try {
    const token = await validSession(req, res, req.query.sessionToken);
    if (!token) return;
    const photoId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!await publicTargetAllowed(req, "photo", photoId)) { res.status(404).json({ error: "Photo not found" }); return; }
    const result = await pool.query(
      `SELECT c.id, c.body, p.name AS "authorName", c.created_at AS "createdAt", (c.session_token = $3) AS "canDelete"
       FROM community_photo_comments c
       JOIN community_profiles p ON p.conference_id = c.conference_id AND p.session_token = c.session_token
       WHERE c.photo_id = $1 AND c.conference_id = $2 AND c.hidden = false
       ORDER BY c.created_at, c.id LIMIT $4 OFFSET $5`,
      [photoId, req.conferenceId, token, pageSize(req.query.limit, 100), Math.max(0, Number.parseInt(String(req.query.offset ?? "0"), 10) || 0)],
    );
    res.json({ comments: result.rows });
  } catch (err) {
    req.log.error({ err }, "photo comments fetch failed");
    res.status(500).json({ error: "Failed to fetch photo comments" });
  }
});

router.post("/community/photos/:id/comments", async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionToken, name, body } = req.body ?? {};
    const token = await validSession(req, res, sessionToken);
    if (!token) return;
    const cleanName = cleanString(name, 50);
    const cleanBody = cleanString(body, 3000);
    if (!cleanName || !cleanBody) { res.status(400).json({ error: "name (1-50) and body (1-3000) are required" }); return; }
    if (writeLimited(req, token)) { res.status(429).json({ error: "Too many community posts; please try again later" }); return; }
    const photoId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!await publicTargetAllowed(req, "photo", photoId)) { res.status(404).json({ error: "Photo not found" }); return; }
    await pool.query(
      `INSERT INTO community_profiles (conference_id, session_token, name) VALUES ($1, $2, $3)
       ON CONFLICT (conference_id, session_token) DO UPDATE SET name = EXCLUDED.name, updated_at = NOW()`,
      [req.conferenceId, token, cleanName],
    );
    if ((await profileFor(req, token))?.restricted) { res.status(403).json({ error: "Community posting is restricted" }); return; }
    const result = await pool.query(
      `INSERT INTO community_photo_comments (conference_id, photo_id, session_token, body)
       VALUES ($1, $2, $3, $4) RETURNING id, body, created_at AS "createdAt"`,
      [req.conferenceId, photoId, token, cleanBody],
    );
    res.status(201).json({ comment: { ...result.rows[0], authorName: cleanName, canDelete: true } });
  } catch (err) {
    req.log.error({ err }, "photo comment create failed");
    res.status(500).json({ error: "Failed to create photo comment" });
  }
});

router.delete("/community/:type/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionToken } = req.body ?? {};
    const token = await validSession(req, res, sessionToken);
    if (!token) return;
    const type = req.params.type as CommunityType;
    if (!["comment", "reply", "discussion"].includes(type)) { res.status(400).json({ error: "Only comments, replies, and discussions can be deleted here" }); return; }
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const numericId = positiveIntegerId(id);
    if (numericId === null) { res.status(400).json({ error: "Community content id must be a positive integer" }); return; }
    const target = await contentTarget(req.conferenceId, type, String(numericId));
    if (!target) { res.status(404).json({ error: "Community content not found" }); return; }
    if (target.owner !== token) { res.status(403).json({ error: "Only the content owner may delete it" }); return; }
    await pool.query(`DELETE FROM ${target.table} WHERE ${target.idColumn} = $1 AND conference_id = $2`, [numericId, req.conferenceId]);
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "community content delete failed");
    res.status(500).json({ error: "Failed to delete community content" });
  }
});

router.post("/community/reports", async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionToken, type, id, reason } = req.body ?? {};
    const token = await validSession(req, res, sessionToken);
    if (!token) return;
    if (typeof type !== "string" || !validTypes.has(type) || (typeof id !== "string" && typeof id !== "number") || String(id).length > 128) {
      res.status(400).json({ error: "type and id are invalid" }); return;
    }
    const normalizedId = type === "photo" ? String(id) : positiveIntegerId(id)?.toString();
    if (!normalizedId) { res.status(400).json({ error: "id must be a valid content id" }); return; }
    const cleanReason = cleanString(reason, 500);
    if (!cleanReason) { res.status(400).json({ error: "reason must be 1-500 characters" }); return; }
    if (limited(reportWindows, `${req.conferenceId}:${token}`, 5, 60 * 60_000)) { res.status(429).json({ error: "Too many reports; please try again later" }); return; }
    const exists = await contentTarget(req.conferenceId, type as CommunityType, normalizedId);
    if (!exists) { res.status(404).json({ error: "Reported content not found" }); return; }
    await pool.query(
      `INSERT INTO community_reports (conference_id, type, target_id, reason, reporter_token)
       VALUES ($1, $2, $3, $4, $5)`,
      [req.conferenceId, type, normalizedId, cleanReason, token],
    );
    res.status(201).json({ success: true });
  } catch (err) {
    req.log.error({ err }, "community report create failed");
    res.status(500).json({ error: "Failed to submit report" });
  }
});

async function calculateLeaderboard(conferenceId: number, token?: string) {
  const settings = await pool.query(
    'SELECT cutoff_at AS "cutoffAt" FROM community_settings WHERE conference_id = $1',
    [conferenceId],
  );
  const cutoff = settings.rows[0]?.cutoffAt ?? null;
  const profiles = await pool.query(
    "SELECT session_token AS token, name FROM community_profiles WHERE conference_id = $1",
    [conferenceId],
  );
  const scoreMap = new Map<string, { name: string; points: number }>();
  for (const row of profiles.rows) scoreMap.set(row.token, { name: row.name, points: 0 });
  const photoUploaders = await pool.query(
    "SELECT DISTINCT uploader_device_id AS token, uploader_name AS name FROM congress_photos WHERE conference_id = $1",
    [conferenceId],
  );
  for (const row of photoUploaders.rows) {
    if (!scoreMap.has(row.token)) scoreMap.set(row.token, { name: row.name, points: 0 });
  }
  const activities = await pool.query(
    `SELECT p.uploader_device_id AS token, p.created_at AS at, 'photo' AS kind FROM congress_photos p
     WHERE p.conference_id = $1 AND p.hidden = false
       AND ($2::timestamptz IS NULL OR p.created_at <= $2)
     UNION ALL
     SELECT d.session_token, d.created_at, 'discussion' FROM community_discussions d
     WHERE d.conference_id = $1 AND d.hidden = false AND ($2::timestamptz IS NULL OR d.created_at <= $2)
     UNION ALL
     SELECT r.session_token, r.created_at, 'reply' FROM community_replies r
     JOIN community_discussions d ON d.id = r.discussion_id AND d.conference_id = r.conference_id
     WHERE r.conference_id = $1 AND r.hidden = false AND d.hidden = false AND ($2::timestamptz IS NULL OR r.created_at <= $2)
     UNION ALL
     SELECT c.session_token, c.created_at, 'comment' FROM community_photo_comments c
     JOIN congress_photos p ON p.id = c.photo_id AND p.conference_id = c.conference_id
     WHERE c.conference_id = $1 AND c.hidden = false AND p.hidden = false AND ($2::timestamptz IS NULL OR c.created_at <= $2)
     ORDER BY at ASC`,
    [conferenceId, cutoff],
  );
  const perDay = new Map<string, Record<string, number>>();
  for (const activity of activities.rows) {
    const day = new Date(activity.at).toISOString().slice(0, 10);
    const limits = perDay.get(activity.token + ":" + day) ?? { photo: 0, discussion: 0, social: 0 };
    let points = 0;
    if (activity.kind === "photo" && limits.photo < 2) { limits.photo += 1; points = 5; }
    else if (activity.kind === "discussion" && limits.discussion < 2) { limits.discussion += 1; points = 5; }
    else if ((activity.kind === "reply" || activity.kind === "comment") && limits.social < 5) { limits.social += 1; points = 3; }
    perDay.set(activity.token + ":" + day, limits);
    const profile = scoreMap.get(activity.token);
    if (profile) profile.points += points;
  }
  const likes = await pool.query(
    `WITH unique_daily_likes AS (
       SELECT DISTINCT ON (
         p.uploader_device_id, l.device_id, (l.created_at AT TIME ZONE 'UTC')::date
       ) p.uploader_device_id AS token, l.device_id, l.created_at AS at
       FROM congress_photo_likes l
       JOIN congress_photos p ON p.id = l.photo_id
       WHERE p.conference_id = $1 AND p.uploader_device_id <> l.device_id AND p.hidden = false
         AND ($2::timestamptz IS NULL OR l.created_at <= $2)
       ORDER BY p.uploader_device_id, l.device_id, (l.created_at AT TIME ZONE 'UTC')::date, l.created_at ASC, p.id
     )
     SELECT token, device_id, at FROM unique_daily_likes ORDER BY at ASC, token ASC, device_id ASC`,
    [conferenceId, cutoff],
  );
  const likesPerDay = new Map<string, number>();
  for (const like of likes.rows) {
    const day = new Date(like.at).toISOString().slice(0, 10);
    const key = like.token + ":" + day;
    const count = likesPerDay.get(key) ?? 0;
    if (count < 10) {
      const profile = scoreMap.get(like.token);
      if (profile) profile.points += 1;
      likesPerDay.set(key, count + 1);
    }
  }
  const ranked = [...scoreMap.entries()]
    .map(([sessionToken, value]) => ({ sessionToken, ...value }))
    .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name) || a.sessionToken.localeCompare(b.sessionToken))
    .map((leader, index) => ({ ...leader, rank: index + 1 }));
  const me = token ? ranked.find((row) => row.sessionToken === token) : undefined;
  return {
    leaders: ranked.map(({ sessionToken, name, points, rank }) => ({ sessionToken, name, points, rank })),
    me: me ? { name: me.name, points: me.points, rank: me.rank } : null,
    cutoffAt: cutoff,
  };
}

router.get("/community/leaderboard", async (req: Request, res: Response): Promise<void> => {
  try {
    const token = await validSession(req, res, req.query.sessionToken);
    if (!token) return;
    const scoreboard = await calculateLeaderboard(req.conferenceId, token);
    res.json({
      ...scoreboard,
      leaders: scoreboard.leaders.slice(0, 50).map(({ name, points, rank }) => ({ name, points, rank })),
    });
  } catch (err) {
    req.log.error({ err }, "community leaderboard fetch failed");
    res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
});

router.get("/community/admin/leaderboard", async (req: Request, res: Response): Promise<void> => {
  if (!requireAdmin(req, res, 403)) return;
  try {
    const scoreboard = await calculateLeaderboard(req.conferenceId);
    res.json({ leaders: scoreboard.leaders, cutoffAt: scoreboard.cutoffAt });
  } catch (err) {
    req.log.error({ err }, "community admin leaderboard export failed");
    res.status(500).json({ error: "Failed to export the full leaderboard" });
  }
});

router.get("/community/admin/actions", async (req: Request, res: Response): Promise<void> => {
  if (!requireAdmin(req, res, 403)) return;
  const rawBefore = req.query.before;
  const before = rawBefore === undefined ? null : positiveIntegerId(rawBefore);
  if (rawBefore !== undefined && before === null) { res.status(400).json({ error: "before must be a positive action id" }); return; }
  try {
    const result = await pool.query(
      `SELECT id, action, target_type AS "targetType", target_id AS "targetId",
              previous_value AS "previousValue", new_value AS "newValue",
              reason, actor_label AS "actorLabel", created_at AS "createdAt"
       FROM community_admin_actions
       WHERE conference_id = $1 AND ($2::integer IS NULL OR id < $2)
       ORDER BY id DESC LIMIT 51`,
      [req.conferenceId, before],
    );
    const actions = result.rows.slice(0, 50);
    res.json({ actions, nextBefore: result.rows.length > 50 ? actions[actions.length - 1].id : null });
  } catch (err) {
    req.log.error({ err }, "community action history fetch failed");
    res.status(500).json({ error: "Failed to fetch community action history" });
  }
});

router.get("/community/admin/actions/export", async (req: Request, res: Response): Promise<void> => {
  if (!requireAdmin(req, res, 403)) return;
  try {
    const result = await pool.query<{
      id: number;
      created_at: Date;
      action: string;
      target_type: string;
      target_id: string;
      previous_value: string | null;
      new_value: string | null;
      reason: string;
      actor_label: string;
    }>(
      `SELECT id, created_at, action, target_type, target_id,
              previous_value, new_value, reason, actor_label
       FROM community_admin_actions
       WHERE conference_id = $1
       ORDER BY id ASC`,
      [req.conferenceId],
    );
    const rows = [
      ["actionTime", "action", "targetType", "targetId", "previousState", "newState", "reason", "actorLabel"],
      ...result.rows.map(row => [
        row.created_at.toISOString(), row.action, row.target_type, row.target_id,
        row.previous_value, row.new_value, row.reason, row.actor_label,
      ]),
    ];
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="community-decisions-${req.conferenceId}.csv"`);
    res.setHeader("Cache-Control", "no-store");
    res.send("\uFEFF" + rows.map(row => row.map(csvCell).join(",")).join("\r\n") + "\r\n");
  } catch (err) {
    req.log.error({ err }, "community action history export failed");
    res.status(500).json({ error: "Failed to export community action history" });
  }
});

router.get("/community/admin", async (req: Request, res: Response): Promise<void> => {
  if (!requireAdmin(req, res, 403)) return;
  try {
    const [reports, photos, discussions, replies, comments, users, settings] = await Promise.all([
      pool.query(
        `SELECT r.id, r.type, r.target_id AS "targetId", r.reason, COALESCE(p.name, 'Attendee') AS "reporterName", r.created_at AS "createdAt", r.status
         FROM community_reports r LEFT JOIN community_profiles p ON p.conference_id = r.conference_id AND p.session_token = r.reporter_token
         WHERE r.conference_id = $1 ORDER BY r.created_at DESC LIMIT 500`,
        [req.conferenceId],
      ),
      pool.query(`SELECT 'photo' AS type, id, caption AS body, object_path AS "objectPath", uploader_name AS "authorName", uploader_device_id AS "sessionToken", hidden, created_at AS "createdAt" FROM congress_photos WHERE conference_id = $1`, [req.conferenceId]),
      pool.query(`SELECT 'discussion' AS type, id::text, title || E'\\n' || body AS body, p.name AS "authorName", d.session_token AS "sessionToken", d.hidden, d.created_at AS "createdAt" FROM community_discussions d JOIN community_profiles p ON p.conference_id = d.conference_id AND p.session_token = d.session_token WHERE d.conference_id = $1`, [req.conferenceId]),
      pool.query(`SELECT 'reply' AS type, id::text, body, p.name AS "authorName", r.session_token AS "sessionToken", r.hidden, r.created_at AS "createdAt" FROM community_replies r JOIN community_profiles p ON p.conference_id = r.conference_id AND p.session_token = r.session_token WHERE r.conference_id = $1`, [req.conferenceId]),
      pool.query(`SELECT 'comment' AS type, id::text, body, p.name AS "authorName", c.session_token AS "sessionToken", c.hidden, c.created_at AS "createdAt" FROM community_photo_comments c JOIN community_profiles p ON p.conference_id = c.conference_id AND p.session_token = c.session_token WHERE c.conference_id = $1`, [req.conferenceId]),
      pool.query(
        `SELECT session_token AS "sessionToken", name, restricted FROM community_profiles WHERE conference_id = $1
         UNION
         SELECT p.uploader_device_id, p.uploader_name, false FROM congress_photos p
         WHERE p.conference_id = $1 AND NOT EXISTS (
           SELECT 1 FROM community_profiles cp WHERE cp.conference_id = p.conference_id AND cp.session_token = p.uploader_device_id
         )
         ORDER BY name`,
        [req.conferenceId],
      ),
      pool.query(`SELECT cutoff_at AS "cutoffAt" FROM community_settings WHERE conference_id = $1`, [req.conferenceId]),
    ]);
    const content = [...photos.rows, ...discussions.rows, ...replies.rows, ...comments.rows]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 500);
    res.json({ reports: reports.rows, content, users: users.rows, cutoffAt: settings.rows[0]?.cutoffAt ?? null });
  } catch (err) {
    req.log.error({ err }, "community admin data fetch failed");
    res.status(500).json({ error: "Failed to fetch community administration data" });
  }
});

router.patch("/community/admin/content", async (req: Request, res: Response): Promise<void> => {
  const operator = readOperatorSession(req);
  if (!operator) { res.status(401).json({ error: "Sign in with an operator name to make community decisions" }); return; }
  const { type, id, hidden } = req.body ?? {};
  const reason = decisionReason(req.body?.reason);
  if (!validTypes.has(type) || (typeof id !== "string" && typeof id !== "number") || typeof hidden !== "boolean") {
    res.status(400).json({ error: "type, id, and boolean hidden are required" }); return;
  }
  if (!reason) { res.status(400).json({ error: "A reason (1–500 characters) is required" }); return; }
  const normalizedId = type === "photo" ? String(id) : positiveIntegerId(id);
  if (normalizedId === null || normalizedId === "") { res.status(400).json({ error: "id must be a valid content id" }); return; }
  try {
    const tableByType: Record<CommunityType, string> = {
      photo: "congress_photos", comment: "community_photo_comments", discussion: "community_discussions", reply: "community_replies",
    };
    const result = await recordDecision(
      req, operator, hidden ? "hide" : "restore", type, String(normalizedId), reason,
      async client => {
        const current = await client.query(
          `SELECT hidden FROM ${tableByType[type as CommunityType]} WHERE id = $1 AND conference_id = $2 FOR UPDATE`,
          [String(normalizedId), req.conferenceId],
        );
        if (!current.rowCount) return null;
        const previousValue = String(current.rows[0].hidden);
        if (current.rows[0].hidden !== hidden) {
          await client.query(
            `UPDATE ${tableByType[type as CommunityType]} SET hidden = $1 WHERE id = $2 AND conference_id = $3`,
            [hidden, String(normalizedId), req.conferenceId],
          );
        }
        return { previousValue, newValue: String(hidden) };
      },
    );
    if (!result) { res.status(404).json({ error: "Content not found" }); return; }
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "community admin content update failed");
    res.status(500).json({ error: "Failed to update content" });
  }
});

router.patch("/community/admin/users", async (req: Request, res: Response): Promise<void> => {
  const operator = readOperatorSession(req);
  if (!operator) { res.status(401).json({ error: "Sign in with an operator name to make community decisions" }); return; }
  const { sessionToken, restricted } = req.body ?? {};
  const reason = decisionReason(req.body?.reason);
  if (typeof sessionToken !== "string" || !sessionToken || typeof restricted !== "boolean") { res.status(400).json({ error: "sessionToken and boolean restricted are required" }); return; }
  if (!reason) { res.status(400).json({ error: "A reason (1–500 characters) is required" }); return; }
  try {
    const result = await recordDecision(
      req, operator, restricted ? "restrict" : "unrestrict", "participant", sessionToken, reason,
      async client => {
        // Older photo uploaders may predate community profiles but still appear
        // in the admin list. Materialize their profile before locking it so the
        // restriction is enforced by the photo upload and community routes.
        await client.query(
          `INSERT INTO community_profiles (conference_id, session_token, name)
           SELECT $1, $2, p.uploader_name FROM congress_photos p
           WHERE p.conference_id = $1 AND p.uploader_device_id = $2
           ORDER BY p.created_at DESC LIMIT 1
           ON CONFLICT (conference_id, session_token) DO NOTHING`,
          [req.conferenceId, sessionToken],
        );
        const current = await client.query(
          "SELECT restricted FROM community_profiles WHERE conference_id = $1 AND session_token = $2 FOR UPDATE",
          [req.conferenceId, sessionToken],
        );
        if (!current.rowCount) return null;
        if (current.rows[0].restricted !== restricted) {
          await client.query(
            "UPDATE community_profiles SET restricted = $1, updated_at = NOW() WHERE conference_id = $2 AND session_token = $3",
            [restricted, req.conferenceId, sessionToken],
          );
        }
        return { previousValue: String(current.rows[0].restricted), newValue: String(restricted) };
      },
    );
    if (!result) { res.status(404).json({ error: "Community profile not found" }); return; }
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "community admin user update failed");
    res.status(500).json({ error: "Failed to update community user" });
  }
});

router.patch("/community/admin/reports/:id", async (req: Request, res: Response): Promise<void> => {
  const operator = readOperatorSession(req);
  if (!operator) { res.status(401).json({ error: "Sign in with an operator name to make community decisions" }); return; }
  const { status } = req.body ?? {};
  if (status !== "dismissed" && status !== "resolved") { res.status(400).json({ error: "status must be dismissed or resolved" }); return; }
  const reason = decisionReason(req.body?.reason);
  if (!reason) { res.status(400).json({ error: "A reason (1–500 characters) is required" }); return; }
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const numericId = positiveIntegerId(id);
    if (numericId === null) { res.status(400).json({ error: "Report id must be a positive integer" }); return; }
    const result = await recordDecision(
      req, operator, status === "resolved" ? "resolve_report" : "dismiss_report", "report", String(numericId), reason,
      async client => {
        const current = await client.query(
          "SELECT status FROM community_reports WHERE id = $1 AND conference_id = $2 FOR UPDATE",
          [numericId, req.conferenceId],
        );
        if (!current.rowCount) return null;
        if (current.rows[0].status !== status) {
          await client.query("UPDATE community_reports SET status = $1 WHERE id = $2 AND conference_id = $3", [status, numericId, req.conferenceId]);
        }
        return { previousValue: current.rows[0].status, newValue: status };
      },
    );
    if (!result) { res.status(404).json({ error: "Report not found" }); return; }
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "community report status update failed");
    res.status(500).json({ error: "Failed to update report" });
  }
});

router.patch("/community/admin/settings", async (req: Request, res: Response): Promise<void> => {
  const operator = readOperatorSession(req);
  if (!operator) { res.status(401).json({ error: "Sign in with an operator name to make community decisions" }); return; }
  const { cutoffAt } = req.body ?? {};
  if (cutoffAt !== null && (typeof cutoffAt !== "string" || !Number.isFinite(Date.parse(cutoffAt)))) {
    res.status(400).json({ error: "cutoffAt must be a valid timestamp or null" }); return;
  }
  const reason = decisionReason(req.body?.reason);
  if (!reason) { res.status(400).json({ error: "A reason (1–500 characters) is required" }); return; }
  try {
    const normalized = cutoffAt === null ? null : new Date(cutoffAt).toISOString();
    const result = await recordDecision(
      req, operator, normalized === null ? "clear_cutoff" : "set_cutoff", "scoring_cutoff", String(req.conferenceId), reason,
      async client => {
        // The conference lock also serializes first-time settings inserts.
        await client.query("SELECT id FROM conferences WHERE id = $1 FOR UPDATE", [req.conferenceId]);
        const current = await client.query(
          "SELECT cutoff_at FROM community_settings WHERE conference_id = $1 FOR UPDATE", [req.conferenceId],
        );
        const previousValue = current.rows[0]?.cutoff_at?.toISOString() ?? null;
        if (previousValue !== normalized) {
          await client.query(
            `INSERT INTO community_settings (conference_id, cutoff_at) VALUES ($1, $2)
             ON CONFLICT (conference_id) DO UPDATE SET cutoff_at = EXCLUDED.cutoff_at, updated_at = NOW()`,
            [req.conferenceId, normalized],
          );
        }
        return { previousValue, newValue: normalized };
      },
    );
    res.json({ cutoffAt: result?.newValue ?? null });
  } catch (err) {
    req.log.error({ err }, "community settings update failed");
    res.status(500).json({ error: "Failed to update community settings" });
  }
});

export default router;