import { pool } from "./db";

export async function ensureConferencesTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS conferences (
      id                    SERIAL PRIMARY KEY,
      name                  VARCHAR(255) NOT NULL,
      organization          VARCHAR(255) NOT NULL,
      dates                 VARCHAR(255),
      location              VARCHAR(255),
      primary_color         VARCHAR(20),
      primary_dark_color    VARCHAR(20),
      secondary_color       VARCHAR(20),
      secondary_dark_color  VARCHAR(20),
      accent_color          VARCHAR(20),
      accent_foreground_color VARCHAR(20),
      logo_url              TEXT,
      feature_voting        BOOLEAN NOT NULL DEFAULT false,
      feature_photos        BOOLEAN NOT NULL DEFAULT false,
      feature_exhibit_hall  BOOLEAN NOT NULL DEFAULT false,
      created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    INSERT INTO conferences
      (id, name, organization, dates, location, primary_color, primary_dark_color,
       feature_voting, feature_photos, feature_exhibit_hall)
    VALUES (
      1,
      '2026 UOA Annual Congress',
      'Utah Optometric Association',
      'June 4–7, 2026',
      'Grand Hyatt Deer Valley, Park City, UT',
      '#4f46e5',
      '#818cf8',
      true, true, true
    )
    ON CONFLICT (id) DO NOTHING;

    -- Advance the SERIAL sequence past any manually-inserted IDs so new INSERTs don't conflict
    SELECT setval(pg_get_serial_sequence('conferences', 'id'), GREATEST(MAX(id), 1))
    FROM conferences;
  `);
}
