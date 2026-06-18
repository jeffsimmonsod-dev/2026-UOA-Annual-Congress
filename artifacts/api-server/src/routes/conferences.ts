import crypto from "crypto";
import { Router, type Request, type Response } from "express";
import { pool } from "../lib/db";
import { logger } from "../lib/logger";
import { ensureConferencesTable } from "../lib/ensureConferences";
import {
  SEED_SPEAKERS,
  SEED_DOC_SESSIONS,
  SEED_PARA_SESSIONS,
  SEED_SPONSORS,
} from "../data/uoa2026";

const router = Router();

function getAdminPin(): string {
  const pin = process.env.ADMIN_PIN;
  if (!pin) throw new Error("ADMIN_PIN environment variable is not set");
  return pin;
}

function isAdmin(req: Request): boolean {
  try {
    return req.headers["x-admin-pin"] === getAdminPin();
  } catch {
    return false;
  }
}

async function ensureStructuralTables(): Promise<void> {
  await ensureConferencesTable();

  await pool.query(`
    CREATE TABLE IF NOT EXISTS conference_speakers (
      id           SERIAL PRIMARY KEY,
      conference_id INTEGER NOT NULL REFERENCES conferences(id) ON DELETE CASCADE,
      external_id  TEXT NOT NULL,
      name         TEXT NOT NULL,
      title        TEXT,
      company      TEXT,
      bio          TEXT,
      photo_url    TEXT,
      session_ids  TEXT[] NOT NULL DEFAULT '{}',
      UNIQUE (conference_id, external_id)
    );

    CREATE TABLE IF NOT EXISTS conference_sessions (
      id            SERIAL PRIMARY KEY,
      conference_id INTEGER NOT NULL REFERENCES conferences(id) ON DELETE CASCADE,
      external_id   TEXT NOT NULL,
      title         TEXT NOT NULL,
      description   TEXT,
      start_time    TEXT,
      end_time      TEXT,
      day           TEXT,
      room          TEXT,
      track         TEXT,
      speaker_ids   TEXT[] NOT NULL DEFAULT '{}',
      tags          TEXT[] NOT NULL DEFAULT '{}',
      is_para       BOOLEAN NOT NULL DEFAULT false,
      UNIQUE (conference_id, external_id, is_para)
    );

    CREATE TABLE IF NOT EXISTS conference_sponsors (
      id            SERIAL PRIMARY KEY,
      conference_id INTEGER NOT NULL REFERENCES conferences(id) ON DELETE CASCADE,
      external_id   TEXT NOT NULL,
      name          TEXT NOT NULL,
      tier          TEXT NOT NULL,
      website       TEXT,
      logo_url      TEXT,
      description   TEXT,
      UNIQUE (conference_id, external_id)
    );
  `);

  await seedConference1();
}

async function seedConference1(): Promise<void> {
  const { rows } = await pool.query(
    `SELECT COUNT(*) FROM conference_speakers WHERE conference_id = 1`
  );
  if (parseInt(rows[0].count, 10) > 0) return;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    for (const sp of SEED_SPEAKERS) {
      await client.query(
        `INSERT INTO conference_speakers
           (conference_id, external_id, name, title, company, bio, photo_url, session_ids)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         ON CONFLICT (conference_id, external_id) DO NOTHING`,
        [1, sp.id, sp.name, sp.title, sp.company, sp.bio, sp.photoUrl, sp.sessionIds]
      );
    }

    for (const s of [...SEED_DOC_SESSIONS, ...SEED_PARA_SESSIONS]) {
      await client.query(
        `INSERT INTO conference_sessions
           (conference_id, external_id, title, description, start_time, end_time,
            day, room, track, speaker_ids, tags, is_para)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         ON CONFLICT (conference_id, external_id, is_para) DO NOTHING`,
        [
          1, s.id, s.title, s.description, s.startTime, s.endTime,
          s.day, s.room, s.track, s.speakerIds, s.tags, s.isPara,
        ]
      );
    }

    for (const sp of SEED_SPONSORS) {
      await client.query(
        `INSERT INTO conference_sponsors
           (conference_id, external_id, name, tier, website, logo_url, description)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (conference_id, external_id) DO NOTHING`,
        [1, sp.id, sp.name, sp.tier, sp.website, sp.logoUrl, sp.description]
      );
    }

    await client.query("COMMIT");
    logger.info("Conference 1 structural data seeded");
  } catch (err) {
    await client.query("ROLLBACK");
    logger.error({ err }, "Failed to seed conference 1 structural data");
  } finally {
    client.release();
  }
}

ensureStructuralTables().catch((err) =>
  logger.error({ err }, "conferences ensureStructuralTables error")
);

router.get("/conferences/:id/config", async (req: Request, res: Response) => {
  const id = parseInt(req.params["id"] as string, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid conference id" });
    return;
  }
  try {
    const { rows } = await pool.query(
      `SELECT * FROM conferences WHERE id = $1`,
      [id]
    );
    if (rows.length === 0) {
      res.status(404).json({ error: "Conference not found" });
      return;
    }
    const c = rows[0];
    res.json({
      conferenceId: c.id,
      conferenceName: c.name,
      organizationName: c.organization,
      dates: c.dates ?? "",
      location: c.location ?? "",
      primaryColor: c.primary_color ?? "#4f46e5",
      primaryDarkColor: c.primary_dark_color ?? "#818cf8",
      secondaryColor: c.secondary_color ?? "#f1f5f9",
      secondaryDarkColor: c.secondary_dark_color ?? "#1e293b",
      accentColor: c.accent_color ?? "#e0e7ff",
      accentForegroundColor: c.accent_foreground_color ?? "#3730a3",
      logoUrl: c.logo_url ?? null,
      featureVoting: c.feature_voting ?? false,
      featurePhotos: c.feature_photos ?? false,
      featureExhibitHall: c.feature_exhibit_hall ?? false,
      createdAt: c.created_at,
    });
  } catch (err) {
    req.log.error({ err }, "conferences config error");
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/conferences", async (req: Request, res: Response) => {
  if (!isAdmin(req)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const {
    name,
    organization,
    dates,
    location,
    primaryColor,
    primaryDarkColor,
    secondaryColor,
    secondaryDarkColor,
    accentColor,
    accentForegroundColor,
    logoUrl,
    featureVoting,
    featurePhotos,
    featureExhibitHall,
  } = req.body as {
    name?: string;
    organization?: string;
    dates?: string;
    location?: string;
    primaryColor?: string;
    primaryDarkColor?: string;
    secondaryColor?: string;
    secondaryDarkColor?: string;
    accentColor?: string;
    accentForegroundColor?: string;
    logoUrl?: string;
    featureVoting?: boolean;
    featurePhotos?: boolean;
    featureExhibitHall?: boolean;
  };

  if (!name?.trim() || !organization?.trim()) {
    res.status(400).json({ error: "name and organization are required" });
    return;
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO conferences
         (name, organization, dates, location, primary_color, primary_dark_color,
          secondary_color, secondary_dark_color, accent_color, accent_foreground_color,
          logo_url, feature_voting, feature_photos, feature_exhibit_hall)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING *`,
      [
        name.trim(),
        organization.trim(),
        dates ?? null,
        location ?? null,
        primaryColor ?? "#4f46e5",
        primaryDarkColor ?? "#818cf8",
        secondaryColor ?? "#f1f5f9",
        secondaryDarkColor ?? "#1e293b",
        accentColor ?? "#e0e7ff",
        accentForegroundColor ?? "#3730a3",
        logoUrl ?? null,
        featureVoting ?? false,
        featurePhotos ?? false,
        featureExhibitHall ?? false,
      ]
    );
    logger.info({ id: rows[0].id, name }, "conference created");
    res.status(201).json({ conference: rows[0] });
  } catch (err) {
    req.log.error({ err }, "conferences create error");
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/conferences/:id/clone", async (req: Request, res: Response) => {
  if (!isAdmin(req)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const sourceId = parseInt(req.params["id"] as string, 10);
  if (isNaN(sourceId)) {
    res.status(400).json({ error: "Invalid conference id" });
    return;
  }

  const { name, organization } = req.body as { name?: string; organization?: string };
  if (!name?.trim()) {
    res.status(400).json({ error: "name is required for the cloned conference" });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const srcRes = await client.query(
      `SELECT * FROM conferences WHERE id = $1`,
      [sourceId]
    );
    if (srcRes.rows.length === 0) {
      await client.query("ROLLBACK");
      res.status(404).json({ error: "Source conference not found" });
      return;
    }
    const src = srcRes.rows[0];

    const newConfRes = await client.query(
      `INSERT INTO conferences
         (name, organization, dates, location, primary_color, primary_dark_color,
          secondary_color, secondary_dark_color, accent_color, accent_foreground_color,
          logo_url, feature_voting, feature_photos, feature_exhibit_hall)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING *`,
      [
        name.trim(),
        (organization ?? src.organization).trim(),
        src.dates,
        src.location,
        src.primary_color,
        src.primary_dark_color,
        src.secondary_color,
        src.secondary_dark_color,
        src.accent_color,
        src.accent_foreground_color,
        src.logo_url,
        src.feature_voting,
        src.feature_photos,
        src.feature_exhibit_hall,
      ]
    );
    const newConf = newConfRes.rows[0];
    const newId = newConf.id;

    // Clone booths with fresh secret tokens
    const boothsRes = await client.query(
      `SELECT name, company, booth_number, description FROM congress_booths WHERE conference_id = $1`,
      [sourceId]
    );
    for (const b of boothsRes.rows) {
      const newToken = crypto.randomBytes(16).toString("hex");
      await client.query(
        `INSERT INTO congress_booths (conference_id, name, company, booth_number, description, secret_token)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [newId, b.name, b.company, b.booth_number, b.description, newToken]
      );
    }

    // Clone speakers
    const speakersRes = await client.query(
      `SELECT external_id, name, title, company, bio, photo_url, session_ids
       FROM conference_speakers WHERE conference_id = $1`,
      [sourceId]
    );
    for (const sp of speakersRes.rows) {
      await client.query(
        `INSERT INTO conference_speakers
           (conference_id, external_id, name, title, company, bio, photo_url, session_ids)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [newId, sp.external_id, sp.name, sp.title, sp.company, sp.bio, sp.photo_url, sp.session_ids]
      );
    }

    // Clone sessions (both doc and para)
    const sessionsRes = await client.query(
      `SELECT external_id, title, description, start_time, end_time,
              day, room, track, speaker_ids, tags, is_para
       FROM conference_sessions WHERE conference_id = $1`,
      [sourceId]
    );
    for (const s of sessionsRes.rows) {
      await client.query(
        `INSERT INTO conference_sessions
           (conference_id, external_id, title, description, start_time, end_time,
            day, room, track, speaker_ids, tags, is_para)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [
          newId, s.external_id, s.title, s.description, s.start_time, s.end_time,
          s.day, s.room, s.track, s.speaker_ids, s.tags, s.is_para,
        ]
      );
    }

    // Clone sponsors
    const sponsorsRes = await client.query(
      `SELECT external_id, name, tier, website, logo_url, description
       FROM conference_sponsors WHERE conference_id = $1`,
      [sourceId]
    );
    for (const sp of sponsorsRes.rows) {
      await client.query(
        `INSERT INTO conference_sponsors
           (conference_id, external_id, name, tier, website, logo_url, description)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [newId, sp.external_id, sp.name, sp.tier, sp.website, sp.logo_url, sp.description]
      );
    }

    await client.query("COMMIT");

    logger.info(
      {
        sourceId,
        newId,
        name,
        boothsCopied: boothsRes.rows.length,
        speakersCopied: speakersRes.rows.length,
        sessionsCopied: sessionsRes.rows.length,
        sponsorsCopied: sponsorsRes.rows.length,
      },
      "conference cloned"
    );

    res.status(201).json({
      conference: newConf,
      boothsCopied: boothsRes.rows.length,
      speakersCopied: speakersRes.rows.length,
      sessionsCopied: sessionsRes.rows.length,
      sponsorsCopied: sponsorsRes.rows.length,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    req.log.error({ err }, "conferences clone error");
    res.status(500).json({ error: "Server error" });
  } finally {
    client.release();
  }
});

export default router;
