import crypto from "crypto";
import { pool } from "./db";
import { logger } from "./logger";

let cached: Promise<string> | null = null;

/**
 * Secret used to sign voting device tokens.
 *
 * Prefers the VOTE_TOKEN_SECRET env var (recommended; at least 32 characters).
 * If it is not set, a random secret is generated once and stored in the
 * database so tokens survive restarts and the feature works without setup.
 */
export function getVoteTokenSecret(): Promise<string> {
  if (cached) return cached;
  cached = (async () => {
    const fromEnv = process.env.VOTE_TOKEN_SECRET;
    if (fromEnv && fromEnv.length >= 32) return fromEnv;
    if (fromEnv) {
      logger.warn("VOTE_TOKEN_SECRET is shorter than 32 characters; ignoring it and using the database-stored secret");
    }
    await pool.query(`
      CREATE TABLE IF NOT EXISTS congress_server_secrets (
        name TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await pool.query(
      `INSERT INTO congress_server_secrets (name, value) VALUES ('vote_token', $1) ON CONFLICT (name) DO NOTHING`,
      [crypto.randomBytes(32).toString("hex")],
    );
    const { rows } = await pool.query(`SELECT value FROM congress_server_secrets WHERE name = 'vote_token'`);
    return rows[0].value as string;
  })();
  cached.catch(() => {
    cached = null;
  });
  return cached;
}
