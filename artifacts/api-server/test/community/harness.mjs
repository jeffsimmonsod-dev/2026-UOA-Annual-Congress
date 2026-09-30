import { randomUUID } from "node:crypto";
import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createServer } from "node:http";
import express from "express";
import pg from "pg";
import { build } from "esbuild";
import { setPool, waitForPoolIdle } from "./db-shim.mjs";

const { Pool } = pg;
const harnessDirectory = path.dirname(fileURLToPath(import.meta.url));
const apiDirectory = path.resolve(harnessDirectory, "../..");
export const ADMIN_PIN = "community-integration-test-only";

function quoteIdentifier(identifier) {
  return `"${identifier.replaceAll('"', '""')}"`;
}

async function listen(app) {
  const server = createServer(app);
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  return server;
}

export async function startHarness() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required to run the isolated community API regression suite");
  }
  const previousAdminPin = process.env.ADMIN_PIN;
  const previousSessionSecret = process.env.SESSION_SECRET;
  process.env.ADMIN_PIN = ADMIN_PIN;
  process.env.SESSION_SECRET = "community-integration-session-secret";

  const adminPool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  const schemaName = `community_regression_${process.pid}_${randomUUID().replaceAll("-", "").slice(0, 12)}`;
  let integrationPool;
  let server;
  let buildDirectory;
  try {
    await adminPool.query(`CREATE SCHEMA ${quoteIdentifier(schemaName)}`);
    // Application queries resolve only against this disposable schema.
    integrationPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      options: `-c search_path=${schemaName}`,
    });
    setPool(integrationPool);
    const pathCheck = await integrationPool.query("SHOW search_path");
    if (pathCheck.rows[0].search_path !== schemaName) {
      throw new Error(`Integration database search_path escaped its schema: ${pathCheck.rows[0].search_path}`);
    }
    await integrationPool.query(`
      CREATE TABLE conferences (
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
        feature_voting BOOLEAN NOT NULL DEFAULT FALSE,
        feature_photos BOOLEAN NOT NULL DEFAULT FALSE,
        feature_exhibit_hall BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE congress_sessions (
        session_token TEXT PRIMARY KEY,
        conference_id INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE congress_photos (
        id TEXT PRIMARY KEY,
        conference_id INTEGER NOT NULL DEFAULT 1,
        object_path TEXT NOT NULL,
        uploader_name TEXT NOT NULL,
        uploader_device_id TEXT NOT NULL,
        caption TEXT NOT NULL DEFAULT '',
        hidden BOOLEAN NOT NULL DEFAULT FALSE,
        drive_file_id TEXT,
        delete_token TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE congress_photo_likes (
        photo_id TEXT NOT NULL REFERENCES congress_photos(id) ON DELETE CASCADE,
        device_id TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (photo_id, device_id)
      );
      CREATE TABLE community_profiles (
        conference_id INTEGER NOT NULL,
        session_token TEXT NOT NULL,
        name VARCHAR(50) NOT NULL,
        restricted BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (conference_id, session_token)
      );
      CREATE TABLE community_discussions (
        id SERIAL PRIMARY KEY,
        conference_id INTEGER NOT NULL,
        session_token TEXT NOT NULL,
        title VARCHAR(120) NOT NULL,
        body TEXT NOT NULL,
        hidden BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE community_replies (
        id SERIAL PRIMARY KEY,
        conference_id INTEGER NOT NULL,
        discussion_id INTEGER NOT NULL REFERENCES community_discussions(id) ON DELETE CASCADE,
        session_token TEXT NOT NULL,
        body TEXT NOT NULL,
        hidden BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE community_photo_comments (
        id SERIAL PRIMARY KEY,
        conference_id INTEGER NOT NULL,
        photo_id TEXT NOT NULL REFERENCES congress_photos(id) ON DELETE CASCADE,
        session_token TEXT NOT NULL,
        body TEXT NOT NULL,
        hidden BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE community_reports (
        id SERIAL PRIMARY KEY,
        conference_id INTEGER NOT NULL,
        type VARCHAR(16) NOT NULL,
        target_id TEXT NOT NULL,
        reason VARCHAR(500) NOT NULL,
        reporter_token TEXT NOT NULL,
        status VARCHAR(16) NOT NULL DEFAULT 'pending',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE community_settings (
        conference_id INTEGER PRIMARY KEY,
        cutoff_at TIMESTAMPTZ,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE community_admin_actions (
        id SERIAL PRIMARY KEY,
        conference_id INTEGER NOT NULL,
        action VARCHAR(32) NOT NULL,
        target_type VARCHAR(32) NOT NULL,
        target_id TEXT NOT NULL,
        previous_value TEXT,
        new_value TEXT,
        reason VARCHAR(500) NOT NULL,
        actor_label VARCHAR(50) NOT NULL,
        actor_session_id TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      INSERT INTO conferences (id, name, organization) VALUES
        (101, 'Isolated Conference One', 'Regression Test'),
        (202, 'Isolated Conference Two', 'Regression Test');
      SELECT setval(pg_get_serial_sequence('conferences', 'id'), 202, TRUE);
    `);

    buildDirectory = path.join(apiDirectory, "test", `.community-build-${process.pid}-${randomUUID().slice(0, 8)}`);
    await mkdir(buildDirectory, { recursive: true });
    const dbShimPath = path.join(harnessDirectory, "db-shim.mjs");
    const externalStubsPath = path.join(harnessDirectory, "external-stubs.mjs");
    await build({
      entryPoints: [
        path.join(apiDirectory, "src/routes/community.ts"),
        path.join(apiDirectory, "src/routes/photos.ts"),
        path.join(apiDirectory, "src/routes/admin.ts"),
      ],
      outdir: buildDirectory,
      bundle: true,
      platform: "node",
      format: "esm",
      packages: "external",
      plugins: [{
        name: "community-integration-shims",
        setup(buildApi) {
          const shims = new Map([
            ["../lib/db", dbShimPath],
            ["../lib/objectStorage", externalStubsPath],
            ["../lib/googleDrive", externalStubsPath],
            ["../lib/ensureConferences", externalStubsPath],
          ]);
          buildApi.onResolve({ filter: /.*/ }, (args) => {
            const shim = shims.get(args.path);
            return shim ? { path: shim, external: true } : undefined;
          });
        },
      }],
    });

    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      req.conferenceId = Number(req.headers["x-conference-id"] ?? 101);
      req.log = { error() {}, info() {} };
      next();
    });
    const realSetInterval = globalThis.setInterval;
    globalThis.setInterval = (...args) => {
      const timer = realSetInterval(...args);
      timer.unref?.();
      return timer;
    };
    try {
      const [communityModule, photosModule, adminModule] = await Promise.all([
        import(pathToFileURL(path.join(buildDirectory, "community.js")).href),
        import(pathToFileURL(path.join(buildDirectory, "photos.js")).href),
        import(pathToFileURL(path.join(buildDirectory, "admin.js")).href),
      ]);
      app.use(communityModule.default);
      app.use(photosModule.default);
      app.use(adminModule.default);
    } finally {
      globalThis.setInterval = realSetInterval;
    }
    await waitForPoolIdle();
    server = await listen(app);
    const context = {
      adminPool,
      integrationPool,
      schemaName,
      server,
      baseUrl: `http://127.0.0.1:${server.address().port}`,
      buildDirectory,
      previousAdminPin,
      previousSessionSecret,
      operatorSession: undefined,
    };
    const signIn = await api(context, "/admin/verify", {
      method: "POST",
      body: { pin: ADMIN_PIN, name: "Regression Organizer" },
    });
    if (signIn.status !== 200 || !signIn.data.operatorSession) {
      throw new Error(`Test operator sign-in failed: HTTP ${signIn.status}`);
    }
    context.operatorSession = signIn.data.operatorSession;
    return context;
  } catch (error) {
    if (server) await new Promise((resolve) => server.close(resolve));
    setPool(undefined);
    if (integrationPool) await integrationPool.end();
    await adminPool.query(`DROP SCHEMA IF EXISTS ${quoteIdentifier(schemaName)} CASCADE`).catch(() => {});
    await adminPool.end();
    if (buildDirectory) await rm(buildDirectory, { recursive: true, force: true });
    if (previousAdminPin === undefined) delete process.env.ADMIN_PIN;
    else process.env.ADMIN_PIN = previousAdminPin;
    if (previousSessionSecret === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = previousSessionSecret;
    throw error;
  }
}

export async function stopHarness(context) {
  if (!context) return;
  await new Promise((resolve) => context.server.close(resolve));
  setPool(undefined);
  await context.integrationPool.end();
  await context.adminPool.query(`DROP SCHEMA IF EXISTS ${quoteIdentifier(context.schemaName)} CASCADE`);
  await context.adminPool.end();
  await rm(context.buildDirectory, { recursive: true, force: true });
  if (context.previousAdminPin === undefined) delete process.env.ADMIN_PIN;
  else process.env.ADMIN_PIN = context.previousAdminPin;
  if (context.previousSessionSecret === undefined) delete process.env.SESSION_SECRET;
  else process.env.SESSION_SECRET = context.previousSessionSecret;
}

export async function api(context, route, {
  conferenceId = 101,
  admin = false,
  method = "GET",
  body,
} = {}) {
  const headers = { "x-conference-id": String(conferenceId) };
  if (admin) {
    headers["x-admin-pin"] = ADMIN_PIN;
    if (context.operatorSession) headers["x-operator-session"] = context.operatorSession;
  }
  let requestBody = body;
  if (admin && method === "PATCH" && body && typeof body === "object" && !body.reason) {
    requestBody = { ...body, reason: "Integration regression test" };
  }
  if (requestBody !== undefined) headers["content-type"] = "application/json";
  const response = await fetch(`${context.baseUrl}${route}`, {
    method,
    headers,
    body: requestBody === undefined ? undefined : JSON.stringify(requestBody),
  });
  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = text;
  }
  return { status: response.status, data };
}

export async function register(pool, conferenceId, token, name = token) {
  await pool.query("INSERT INTO congress_sessions (session_token, conference_id) VALUES ($1, $2)", [token, conferenceId]);
  await pool.query(
    "INSERT INTO community_profiles (conference_id, session_token, name) VALUES ($1, $2, $3)",
    [conferenceId, token, name],
  );
}

export async function photo(pool, {
  id,
  conferenceId = 101,
  token,
  name = token,
  at,
  deleteToken = `${id}-delete`,
}) {
  await pool.query(
    `INSERT INTO congress_photos
       (id, conference_id, object_path, uploader_name, uploader_device_id, caption, delete_token, created_at)
     VALUES ($1, $2, $3, $4, $5, '', $6, $7)`,
    [id, conferenceId, `/objects/${id}.jpg`, name, token, deleteToken, at],
  );
}

export async function discussion(pool, { conferenceId = 101, token, title = "Topic", at }) {
  const result = await pool.query(
    `INSERT INTO community_discussions (conference_id, session_token, title, body, created_at)
     VALUES ($1, $2, $3, 'Discussion body', $4) RETURNING id`,
    [conferenceId, token, title, at],
  );
  return result.rows[0].id;
}

export async function reply(pool, { conferenceId = 101, discussionId, token, body = "Reply", at }) {
  const result = await pool.query(
    `INSERT INTO community_replies (conference_id, discussion_id, session_token, body, created_at)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [conferenceId, discussionId, token, body, at],
  );
  return result.rows[0].id;
}

export async function comment(pool, { conferenceId = 101, photoId, token, body = "Comment", at }) {
  const result = await pool.query(
    `INSERT INTO community_photo_comments (conference_id, photo_id, session_token, body, created_at)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [conferenceId, photoId, token, body, at],
  );
  return result.rows[0].id;
}

export async function hasRow(pool, table, id) {
  const result = await pool.query(`SELECT 1 FROM ${table} WHERE id = $1`, [id]);
  return result.rowCount > 0;
}

export async function points(context, token, conferenceId = 101) {
  const result = await api(context, `/community/leaderboard?sessionToken=${encodeURIComponent(token)}`, { conferenceId });
  if (result.status !== 200) throw new Error(`Leaderboard request failed: HTTP ${result.status}`);
  return result.data.me?.points ?? 0;
}

export const DAY_ONE = "2025-07-04";
export const DAY_TWO = "2025-07-05";