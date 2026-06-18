import { Router, type Request, type Response } from "express";
import { pool } from "../lib/db";
import { logger } from "../lib/logger";

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

async function ensureConferencesTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS conferences (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      organization VARCHAR(255) NOT NULL,
      dates VARCHAR(255),
      location VARCHAR(255),
      primary_color VARCHAR(20),
      primary_dark_color VARCHAR(20),
      secondary_color VARCHAR(20),
      secondary_dark_color VARCHAR(20),
      accent_color VARCHAR(20),
      accent_foreground_color VARCHAR(20),
      logo_url TEXT,
      feature_voting BOOLEAN NOT NULL DEFAULT false,
      feature_photos BOOLEAN NOT NULL DEFAULT false,
      feature_exhibit_hall BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    INSERT INTO conferences (id, name, organization, dates, location, primary_color, primary_dark_color, feature_voting, feature_photos, feature_exhibit_hall)
    VALUES (
      1,
      '2026 UOA Annual Congress',
      'Utah Optometric Association',
      'June 4–7, 2026',
      'Grand Hyatt Deer Valley, Park City, UT',
      '#4f46e5',
      '#818cf8',
      true,
      true,
      true
    )
    ON CONFLICT (id) DO NOTHING;
  `);
}

ensureConferencesTable().catch((err) => logger.error({ err }, "conferences ensureTable error"));

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

    const srcRes = await client.query(`SELECT * FROM conferences WHERE id = $1`, [sourceId]);
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

    const boothsRes = await client.query(
      `SELECT name, company, booth_number, description, secret_token
       FROM congress_booths WHERE conference_id = $1`,
      [sourceId]
    );
    for (const b of boothsRes.rows) {
      const newToken = require("crypto").randomBytes(16).toString("hex");
      await client.query(
        `INSERT INTO congress_booths (conference_id, name, company, booth_number, description, secret_token)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [newId, b.name, b.company, b.booth_number, b.description, newToken]
      );
    }

    await client.query(
      `INSERT INTO congress_voting_state (conference_id, is_open)
       VALUES ($1, false) ON CONFLICT (conference_id) DO NOTHING`,
      [newId]
    );

    await client.query("COMMIT");

    logger.info({ sourceId, newId, name }, "conference cloned");
    res.status(201).json({
      conference: newConf,
      boothsCopied: boothsRes.rows.length,
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
