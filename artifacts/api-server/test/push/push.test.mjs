// DB-backed regression suite for push notifications.
// Requires DATABASE_URL; runs in a disposable schema with a fake Expo client.
import { randomUUID } from "node:crypto";
import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { createServer } from "node:http";
import { after, before, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath, pathToFileURL } from "node:url";
import express from "express";
import pg from "pg";
import { build } from "esbuild";
import { setPool, waitForPoolIdle } from "../community/db-shim.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const apiDir = path.resolve(here, "../..");
const ADMIN_PIN = "push-integration-test-only";
const CRON_SECRET = "push-integration-cron-secret-0123456789";
const tokenA = "ExponentPushToken[aaaaaaaaaaaaaaaaaaaaaa]";
const tokenB = "ExpoPushToken[bbbbbbbbbbbbbbbbbbbbbb]";

let ctx;

// Fake Expo client: records every message and returns scripted tickets/receipts.
const fake = {
  sent: [],
  ticketFor: () => ({ status: "ok", id: randomUUID() }),
  receipts: {},
  failRequests: false,
  chunkPushNotifications: (m) => [m],
  chunkPushNotificationReceiptIds: (ids) => [ids],
  async sendPushNotificationsAsync(chunk) {
    if (fake.failRequests) throw new Error("network down");
    fake.sent.push(...chunk);
    return chunk.map((m) => fake.ticketFor(m));
  },
  async getPushNotificationReceiptsAsync(ids) {
    return Object.fromEntries(ids.filter((id) => fake.receipts[id]).map((id) => [id, fake.receipts[id]]));
  },
};

async function api(route, { method = "GET", body, admin = false, conferenceId = 101, headers = {} } = {}) {
  const h = { "x-conference-id": String(conferenceId), ...headers };
  if (admin) h["x-admin-pin"] = ADMIN_PIN;
  if (body !== undefined) h["content-type"] = "application/json";
  const res = await fetch(`${ctx.baseUrl}/api${route}`, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: res.status, data: await res.json().catch(() => ({})) };
}

before(async () => {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required for the push suite");
  process.env.ADMIN_PIN = ADMIN_PIN;
  process.env.PUSH_CRON_SECRET = CRON_SECRET;
  process.env.LOG_LEVEL = "silent";
  process.env.NODE_ENV = "production"; // plain JSON logger, no pino-pretty transport

  const adminPool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  const schema = `push_regression_${process.pid}_${randomUUID().replaceAll("-", "").slice(0, 10)}`;
  await adminPool.query(`CREATE SCHEMA "${schema}"`);
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 5, options: `-c search_path=${schema}` });
  setPool(pool);
  await pool.query(`
    CREATE TABLE conferences (id SERIAL PRIMARY KEY, name TEXT NOT NULL);
    INSERT INTO conferences (id, name) VALUES (101, 'One'), (202, 'Two');
    -- Legacy layout: token was the global primary key and scheduled_for had no time zone.
    CREATE TABLE congress_push_tokens (
      token TEXT PRIMARY KEY,
      conference_id INTEGER NOT NULL DEFAULT 1,
      registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE congress_scheduled_announcements (
      id SERIAL PRIMARY KEY, title VARCHAR(255) NOT NULL, body TEXT NOT NULL,
      scheduled_for TIMESTAMP NOT NULL, sent_at TIMESTAMP, created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  const outdir = path.join(apiDir, "test", `.push-build-${process.pid}-${randomUUID().slice(0, 8)}`);
  await mkdir(outdir, { recursive: true });
  const shims = new Map([
    ["./db", path.join(here, "../community/db-shim.mjs")],
    ["../lib/db", path.join(here, "../community/db-shim.mjs")],
    ["./ensureConferences", path.join(here, "../community/external-stubs.mjs")],
  ]);
  await build({
    entryPoints: [path.join(apiDir, "src/routes/push.ts"), path.join(apiDir, "src/lib/push.ts")],
    outdir,
    bundle: true,
    splitting: true, // routes and test share one copy of lib/push
    platform: "node",
    format: "esm",
    packages: "external",
    plugins: [{
      name: "push-shims",
      setup(b) {
        b.onResolve({ filter: /.*/ }, (args) => {
          const shim = shims.get(args.path);
          return shim ? { path: shim, external: true } : undefined;
        });
      },
    }],
  });
  const lib = await import(pathToFileURL(path.join(outdir, "lib/push.js")).href);
  lib.setPushClientForTests(fake);
  const routes = await import(pathToFileURL(path.join(outdir, "routes/push.js")).href);

  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.conferenceId = Number(req.headers["x-conference-id"] ?? 101);
    req.log = { error() {}, info() {}, warn() {} };
    next();
  });
  app.use("/api", routes.default);
  await lib.ensurePushTables();
  await waitForPoolIdle();
  const server = createServer(app);
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  ctx = { adminPool, pool, schema, server, outdir, lib, baseUrl: `http://127.0.0.1:${server.address().port}` };
});

after(async () => {
  if (!ctx) return;
  await new Promise((r) => ctx.server.close(r));
  setPool(undefined);
  await ctx.pool.end();
  await ctx.adminPool.query(`DROP SCHEMA IF EXISTS "${ctx.schema}" CASCADE`);
  await ctx.adminPool.end();
  await rm(ctx.outdir, { recursive: true, force: true });
});

beforeEach(async () => {
  fake.sent = [];
  fake.receipts = {};
  fake.failRequests = false;
  fake.ticketFor = () => ({ status: "ok", id: randomUUID() });
  await ctx.pool.query(`TRUNCATE congress_push_tokens, congress_scheduled_announcements, congress_push_sends, congress_push_tickets RESTART IDENTITY CASCADE`);
});

test("legacy tables are migrated: per-conference key and time-zone-aware schedule", async () => {
  const pk = await ctx.pool.query(`
    SELECT array_agg(a.attname::text ORDER BY a.attname) AS cols FROM pg_constraint c
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
    WHERE c.conrelid = 'congress_push_tokens'::regclass AND c.contype = 'p'`);
  assert.deepEqual(pk.rows[0].cols, ["conference_id", "token"]);
  const col = await ctx.pool.query(`
    SELECT data_type FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'congress_scheduled_announcements' AND column_name = 'scheduled_for'`);
  assert.equal(col.rows[0].data_type, "timestamp with time zone");
});

test("register accepts both Expo token formats and keeps conferences separate", async () => {
  assert.equal((await api("/push/register", { method: "POST", body: { token: tokenA, platform: "ios" } })).status, 200);
  assert.equal((await api("/push/register", { method: "POST", body: { token: tokenB, platform: "android" } })).status, 200);
  assert.equal((await api("/push/register", { method: "POST", body: { token: tokenA }, conferenceId: 202 })).status, 200);
  assert.equal((await api("/push/register", { method: "POST", body: { token: "not-a-token" } })).status, 400);
  assert.equal((await api("/push/register", { method: "POST", body: { token: tokenB }, conferenceId: 999 })).status, 404);

  const one = await api("/push/stats", { admin: true });
  assert.deepEqual(one.data, { registeredDevices: 2, ios: 1, android: 1 });
  const two = await api("/push/stats", { admin: true, conferenceId: 202 });
  assert.equal(two.data.registeredDevices, 1, "registering for 202 did not move the token out of 101");
});

test("stats and send require the admin PIN", async () => {
  assert.equal((await api("/push/stats")).status, 401);
  assert.equal((await api("/push/send", { method: "POST", body: { title: "t", body: "b" } })).status, 401);
  assert.equal((await api("/push/send", { method: "POST", body: { title: "t", body: "b" }, headers: { "x-admin-pin": "wrong-pin-value" } })).status, 401);
});

test("send with no devices reports failure honestly", async () => {
  const res = await api("/push/send", { method: "POST", admin: true, body: { title: "t", body: "b" } });
  assert.equal(res.data.success, false);
  assert.equal(res.data.attempted, 0);
  assert.equal(fake.sent.length, 0);
});

test("send uses high priority + default channel, reports counts, drops DeviceNotRegistered", async () => {
  await api("/push/register", { method: "POST", body: { token: tokenA } });
  await api("/push/register", { method: "POST", body: { token: tokenB } });
  fake.ticketFor = (m) => m.to === tokenB
    ? { status: "error", message: "gone", details: { error: "DeviceNotRegistered" } }
    : { status: "ok", id: randomUUID() };
  const res = await api("/push/send", { method: "POST", admin: true, body: { title: "Hello", body: "World" } });
  assert.equal(res.status, 200);
  assert.equal(res.data.success, true);
  assert.equal(res.data.attempted, 2);
  assert.equal(res.data.sent, 1);
  assert.equal(res.data.failed, 1);
  assert.ok(res.data.warning);
  assert.ok(fake.sent.every((m) => m.priority === "high" && m.channelId === "default"));
  const left = await ctx.pool.query(`SELECT token FROM congress_push_tokens`);
  assert.deepEqual(left.rows.map((r) => r.token), [tokenA]);
});

test("send returns 502 when the push service is unreachable", async () => {
  await api("/push/register", { method: "POST", body: { token: tokenA } });
  fake.failRequests = true;
  const res = await api("/push/send", { method: "POST", admin: true, body: { title: "t", body: "b" } });
  assert.equal(res.status, 502);
  assert.equal(res.data.success, false);
});

test("receipts are checked after the delay and DeviceNotRegistered tokens are removed", async () => {
  await api("/push/register", { method: "POST", body: { token: tokenA } });
  await api("/push/register", { method: "POST", body: { token: tokenB } });
  await api("/push/send", { method: "POST", admin: true, body: { title: "t", body: "b" } });
  const tickets = (await ctx.pool.query(`SELECT ticket_id, token FROM congress_push_tickets`)).rows;
  assert.equal(tickets.length, 2);
  for (const t of tickets) {
    fake.receipts[t.ticket_id] = t.token === tokenA
      ? { status: "ok" }
      : { status: "error", message: "gone", details: { error: "DeviceNotRegistered" } };
  }
  // Too early: receipts are not ready for ~15 minutes.
  assert.equal((await ctx.lib.checkReceipts(101)).checked, 0);
  await ctx.pool.query(`UPDATE congress_push_tickets SET created_at = NOW() - INTERVAL '20 minutes'`);
  const summary = await ctx.lib.checkReceipts(101);
  assert.equal(summary.checked, 2);
  assert.equal(summary.delivered, 1);
  assert.equal(summary.failed, 1);
  const send = (await ctx.pool.query(`SELECT delivered, receipt_failed, receipt_errors FROM congress_push_sends`)).rows[0];
  assert.equal(send.delivered, 1);
  assert.equal(send.receipt_failed, 1);
  assert.deepEqual(send.receipt_errors, { DeviceNotRegistered: 1 });
  const left = await ctx.pool.query(`SELECT token FROM congress_push_tokens`);
  assert.deepEqual(left.rows.map((r) => r.token), [tokenA]);
});

test("run-scheduled needs the cron secret and sends each due announcement exactly once", async () => {
  await api("/push/register", { method: "POST", body: { token: tokenA } });
  await ctx.pool.query(
    `INSERT INTO congress_scheduled_announcements (title, body, scheduled_for, conference_id)
     VALUES ('Due', 'now', NOW() - INTERVAL '1 minute', 101),
            ('Later', 'later', NOW() + INTERVAL '1 hour', 101),
            ('Stale', 'old', NOW() - INTERVAL '3 hours', 101)`);
  assert.equal((await api("/push/run-scheduled", { method: "POST", headers: { "x-cron-secret": "wrong" } })).status, 401);
  assert.equal((await api("/push/run-scheduled", { method: "POST" })).status, 401);

  const runs = await Promise.all([1, 2, 3].map(() =>
    api("/push/run-scheduled", { method: "POST", headers: { "x-cron-secret": CRON_SECRET } })));
  assert.ok(runs.every((r) => r.status === 200));
  assert.equal(fake.sent.length, 1, "concurrent runs must not double-send");
  assert.equal(fake.sent[0].title, "Due");

  const rows = (await ctx.pool.query(`SELECT title, sent_at, failed_at, send_id FROM congress_scheduled_announcements ORDER BY id`)).rows;
  assert.ok(rows[0].sent_at && rows[0].send_id);
  assert.equal(rows[1].sent_at, null);
  assert.ok(rows[2].failed_at, "announcements more than an hour late are marked failed, not sent");

  const again = await api("/push/run-scheduled", { method: "POST", headers: { "x-cron-secret": CRON_SECRET } });
  assert.equal(again.status, 200);
  assert.equal(fake.sent.length, 1);
});
