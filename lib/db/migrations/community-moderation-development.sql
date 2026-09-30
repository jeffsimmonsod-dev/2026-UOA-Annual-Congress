-- Development-only, additive setup for existing databases. Apply once through
-- the development database SQL interface; safe to repeat. Do not run on
-- application startup or against production. Publish syncs the development
-- schema to the managed production database.
BEGIN;

ALTER TABLE congress_photos ADD COLUMN IF NOT EXISTS hidden BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS community_profiles (
  conference_id INTEGER NOT NULL,
  session_token TEXT NOT NULL,
  name VARCHAR(50) NOT NULL,
  restricted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (conference_id, session_token)
);

CREATE TABLE IF NOT EXISTS community_discussions (
  id SERIAL PRIMARY KEY,
  conference_id INTEGER NOT NULL,
  session_token TEXT NOT NULL,
  title VARCHAR(120) NOT NULL,
  body TEXT NOT NULL,
  hidden BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS community_replies (
  id SERIAL PRIMARY KEY,
  conference_id INTEGER NOT NULL,
  discussion_id INTEGER NOT NULL REFERENCES community_discussions(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL,
  body TEXT NOT NULL,
  hidden BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS community_photo_comments (
  id SERIAL PRIMARY KEY,
  conference_id INTEGER NOT NULL,
  photo_id TEXT NOT NULL REFERENCES congress_photos(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL,
  body TEXT NOT NULL,
  hidden BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS community_reports (
  id SERIAL PRIMARY KEY,
  conference_id INTEGER NOT NULL,
  type VARCHAR(16) NOT NULL,
  target_id TEXT NOT NULL,
  reason VARCHAR(500) NOT NULL,
  reporter_token TEXT NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS community_settings (
  conference_id INTEGER PRIMARY KEY,
  cutoff_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS community_admin_actions (
  id SERIAL PRIMARY KEY,
  conference_id INTEGER NOT NULL,
  action VARCHAR(32) NOT NULL,
  target_type VARCHAR(32) NOT NULL,
  target_id TEXT NOT NULL,
  previous_value TEXT,
  new_value TEXT,
  reason VARCHAR(500) NOT NULL,
  actor_label VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMIT;