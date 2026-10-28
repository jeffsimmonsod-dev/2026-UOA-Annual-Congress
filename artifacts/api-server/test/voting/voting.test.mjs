// DB-backed regression suite for per-conference voting.
// Requires DATABASE_URL; runs in a disposable schema (never use production).
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
const ADMIN_PIN = "voting-integration-test-only";
const UOA = ["Dr. Steven Blake", "Dr. Aaron King", "Dr. Jonathon King", "Dr. Taylor Linton"];

let ctx;

async function api(route, { method = "GET", body, admin = false, conferenceId = 1, headers = {} } = {}) {
  const h = { "x-conference-id": String(conferenceId), ...headers };
  if (admin) h["x-admin-pin"] = ADMIN_PIN;
  if (body !== undefined) h["content-type"] = "application/json";
  const res = await fetch(`${ctx.baseUrl}/api${route}`, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: res.status, data: await res.json().catch(() => ({})) };
}

async function token(conferenceId = 1) {
  const res = await api("/voting/device", { method: "POST", conferenceId });
  assert.equal(res.status, 200);
  return res.data.votingToken;
}

before(async () => {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required for the voting suite");
  process.env.ADMIN_PIN = ADMIN_PIN;
  process.env.LOG_LEVEL = "silent";
  process.env.NODE_ENV = "production";
  delete process.env.VOTE_TOKEN_SECRET;

  const adminPool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  const schema = `voting_regression_${process.pid}_${randomUUID().replaceAll("-", "").slice(0, 10)}`;
  await adminPool.query(`CREATE SCHEMA "${schema}"`);
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 5, options: `-c search_path=${schema}` });
  setPool(pool);
  // Legacy layout as it exists in production before this change.
  await pool.query(`
    CREATE TABLE conferences (id SERIAL PRIMARY KEY, name TEXT NOT NULL);
    INSERT INTO conferences (id, name) VALUES (1, 'UOA 2026'), (202, 'Other');
    CREATE TABLE congress_voting_state (id INTEGER PRIMARY KEY DEFAULT 1, is_open BOOLEAN NOT NULL DEFAULT false, CHECK (id = 1));
    INSERT INTO congress_voting_state (id, is_open) VALUES (1, false);
    CREATE TABLE congress_votes (
      id SERIAL PRIMARY KEY, device_id TEXT NOT NULL UNIQUE, slate_vote TEXT NOT NULL,
      trustee_votes TEXT[] NOT NULL DEFAULT '{}', submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  const outdir = path.join(apiDir, "test", `.voting-build-${process.pid}-${randomUUID().slice(0, 8)}`);
  await mkdir(outdir, { recursive: true });
  const shims = new Map([
    ["./db", path.join(here, "../community/db-shim.mjs")],
    ["../lib/db", path.join(here, "../community/db-shim.mjs")],
    ["../lib/ensureConferences", path.join(here, "../community/external-stubs.mjs")],
  ]);
  await build({
    entryPoints: [path.join(apiDir, "src/routes/voting.ts")],
    outdir,
    bundle: true,
    platform: "node",
    format: "esm",
    packages: "external",
    plugins: [{
      name: "voting-shims",
      setup(b) {
        b.onResolve({ filter: /.*/ }, (args) => {
          const shim = shims.get(args.path);
          return shim ? { path: shim, external: true } : undefined;
        });
      },
    }],
  });
  const routes = await import(pathToFileURL(path.join(outdir, "voting.js")).href);

  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.conferenceId = Number(req.headers["x-conference-id"] ?? 1);
    req.log = { error() {}, info() {}, warn() {} };
    next();
  });
  app.use("/api", routes.default);
  const server = createServer(app);
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  ctx = { adminPool, pool, schema, server, outdir, baseUrl: `http://127.0.0.1:${server.address().port}` };
  // First request runs the migration + seed.
  await api("/voting/state");
  await waitForPoolIdle();
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
  await ctx.pool.query(`TRUNCATE congress_votes RESTART IDENTITY`);
  await ctx.pool.query(`UPDATE congress_voting_state SET is_open = false`);
  await ctx.pool.query(`DELETE FROM congress_voting_config WHERE conference_id <> 1`);
  await ctx.pool.query(
    `INSERT INTO congress_voting_config (conference_id, trustee_candidates, max_trustee_selections)
     VALUES (1, $1, 3) ON CONFLICT (conference_id) DO UPDATE SET trustee_candidates = $1, max_trustee_selections = 3`,
    [UOA]
  );
});

test("migration seeds conference 1 with today's UOA ballot", async () => {
  const { rows } = await ctx.pool.query(`SELECT * FROM congress_voting_config ORDER BY conference_id`);
  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0].trustee_candidates, UOA);
  assert.equal(rows[0].max_trustee_selections, 3);
  const res = await api("/voting/config");
  assert.deepEqual(res.data, { configured: true, trusteeCandidates: UOA, maxTrusteeSelections: 3 });
});

test("UOA voting works exactly as before (state, token, submit, one vote, results)", async () => {
  assert.deepEqual((await api("/voting/state")).data, { isOpen: false, configured: true });
  assert.equal((await api("/voting/open", { method: "POST", admin: true })).status, 200);
  const t = await token();
  assert.deepEqual((await api("/voting/status", { headers: { "x-voting-token": t } })).data, { hasVoted: false });

  const four = await api("/voting/submit", { method: "POST", body: { votingToken: t, slateVote: "approve", trusteeVotes: UOA } });
  assert.equal(four.status, 400);
  assert.equal(four.data.error, "You may select at most 3 trustee candidates");
  assert.equal((await api("/voting/submit", { method: "POST", body: { votingToken: t, slateVote: "approve", trusteeVotes: ["Nobody"] } })).status, 400);

  const ok = await api("/voting/submit", { method: "POST", body: { votingToken: t, slateVote: "approve", trusteeVotes: UOA.slice(0, 3) } });
  assert.deepEqual(ok, { status: 200, data: { success: true } });
  assert.equal((await api("/voting/submit", { method: "POST", body: { votingToken: t, slateVote: "approve", trusteeVotes: [] } })).status, 409);
  assert.deepEqual((await api("/voting/status", { headers: { "x-voting-token": t } })).data, { hasVoted: true });

  const results = await api("/voting/results", { admin: true });
  assert.equal(results.data.totalVotes, 1);
  assert.deepEqual(results.data.trusteeResults, { [UOA[0]]: 1, [UOA[1]]: 1, [UOA[2]]: 1, [UOA[3]]: 0 });
  assert.deepEqual(results.data.slateResults, { approve: 1, disapprove: 0, abstain: 0 });
});

test("a conference without a ballot gets 'voting not configured', never UOA data", async () => {
  assert.deepEqual((await api("/voting/state", { conferenceId: 202 })).data, { isOpen: false, configured: false });
  const cfg = await api("/voting/config", { conferenceId: 202 });
  assert.equal(cfg.status, 404);
  assert.equal(cfg.data.code, "voting_not_configured");
  assert.equal(cfg.data.configured, false);

  const open = await api("/voting/open", { method: "POST", admin: true, conferenceId: 202 });
  assert.equal(open.status, 409);
  assert.equal(open.data.code, "voting_not_configured");

  const t = await token(202);
  const submit = await api("/voting/submit", { method: "POST", conferenceId: 202, body: { votingToken: t, slateVote: "approve", trusteeVotes: [UOA[0]] } });
  assert.equal(submit.status, 404);
  assert.equal(submit.data.code, "voting_not_configured");

  const results = await api("/voting/results", { admin: true, conferenceId: 202 });
  assert.equal(results.data.configured, false);
  assert.deepEqual(results.data.trusteeResults, {});
});

test("admin can set another conference's ballot; tokens and candidates stay per conference", async () => {
  assert.equal((await api("/voting/config", { method: "PUT", conferenceId: 202, body: { trusteeCandidates: ["Ann"], maxTrusteeSelections: 1 } })).status, 401);
  const bad = await api("/voting/config", { method: "PUT", admin: true, conferenceId: 202, body: { trusteeCandidates: ["Ann"], maxTrusteeSelections: 2 } });
  assert.equal(bad.status, 400);
  const set = await api("/voting/config", { method: "PUT", admin: true, conferenceId: 202, body: { trusteeCandidates: [" Ann ", "Bob"], maxTrusteeSelections: 1 } });
  assert.equal(set.status, 200);
  assert.deepEqual((await api("/voting/config", { conferenceId: 202 })).data, { configured: true, trusteeCandidates: ["Ann", "Bob"], maxTrusteeSelections: 1 });
  assert.deepEqual((await api("/voting/config")).data.trusteeCandidates, UOA, "conference 1 untouched");

  assert.equal((await api("/voting/open", { method: "POST", admin: true, conferenceId: 202 })).status, 200);
  const t202 = await token(202);
  const t1 = await token(1);
  // A token from conference 1 is not valid for 202.
  assert.equal((await api("/voting/submit", { method: "POST", conferenceId: 202, body: { votingToken: t1, slateVote: "abstain", trusteeVotes: ["Ann"] } })).status, 401);
  // UOA names are not valid in 202, and the limit is 202's (1).
  assert.equal((await api("/voting/submit", { method: "POST", conferenceId: 202, body: { votingToken: t202, slateVote: "abstain", trusteeVotes: [UOA[0]] } })).status, 400);
  assert.equal((await api("/voting/submit", { method: "POST", conferenceId: 202, body: { votingToken: t202, slateVote: "abstain", trusteeVotes: ["Ann", "Bob"] } })).status, 400);
  assert.equal((await api("/voting/submit", { method: "POST", conferenceId: 202, body: { votingToken: t202, slateVote: "abstain", trusteeVotes: ["Bob"] } })).status, 200);
  // Conference 1 is still closed.
  assert.equal((await api("/voting/submit", { method: "POST", body: { votingToken: t1, slateVote: "approve", trusteeVotes: [] } })).status, 403);

  const r = await api("/voting/results", { admin: true, conferenceId: 202 });
  assert.deepEqual(r.data.trusteeResults, { Ann: 0, Bob: 1 });
  assert.equal(r.data.maxTrusteeSelections, 1);
});

test("ballot changes are refused while open, and need force once votes exist", async () => {
  await api("/voting/config", { method: "PUT", admin: true, conferenceId: 202, body: { trusteeCandidates: ["Ann", "Bob"], maxTrusteeSelections: 1 } });
  await api("/voting/open", { method: "POST", admin: true, conferenceId: 202 });
  const whileOpen = await api("/voting/config", { method: "PUT", admin: true, conferenceId: 202, body: { trusteeCandidates: ["Cy"], maxTrusteeSelections: 1 } });
  assert.equal(whileOpen.status, 409);
  assert.equal((await api("/voting/config", { method: "DELETE", admin: true, conferenceId: 202 })).status, 409);

  const t = await token(202);
  await api("/voting/submit", { method: "POST", conferenceId: 202, body: { votingToken: t, slateVote: "approve", trusteeVotes: ["Ann"] } });
  await api("/voting/close", { method: "POST", admin: true, conferenceId: 202 });

  const noForce = await api("/voting/config", { method: "PUT", admin: true, conferenceId: 202, body: { trusteeCandidates: ["Cy"], maxTrusteeSelections: 1 } });
  assert.equal(noForce.status, 409);
  assert.equal(noForce.data.code, "votes_exist");
  // Same names, new limit: fine without force.
  assert.equal((await api("/voting/config", { method: "PUT", admin: true, conferenceId: 202, body: { trusteeCandidates: ["Ann", "Bob"], maxTrusteeSelections: 2 } })).status, 200);
  assert.equal((await api("/voting/config", { method: "PUT", admin: true, conferenceId: 202, body: { trusteeCandidates: ["Cy"], maxTrusteeSelections: 1, force: true } })).status, 200);

  assert.equal((await api("/voting/config", { method: "DELETE", admin: true, conferenceId: 202 })).status, 200);
  assert.equal((await api("/voting/config", { conferenceId: 202 })).status, 404);
});

test("unknown conference ids are rejected when saving a ballot", async () => {
  const res = await api("/voting/config", { method: "PUT", admin: true, conferenceId: 999, body: { trusteeCandidates: ["Ann"], maxTrusteeSelections: 1 } });
  assert.equal(res.status, 404);
});

test("seed runs only once: a removed UOA ballot is not put back by a re-run", async () => {
  await ctx.pool.query(`DELETE FROM congress_voting_config WHERE conference_id = 1`);
  // Simulate a fresh process running ensureTables again by re-importing the bundle.
  const fresh = await import(pathToFileURL(path.join(ctx.outdir, "voting.js")).href + `?again=${Date.now()}`);
  const app = express();
  app.use((req, _res, next) => { req.conferenceId = 1; req.log = { error() {}, info() {}, warn() {} }; next(); });
  app.use("/api", fresh.default);
  const server = createServer(app);
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const res = await fetch(`http://127.0.0.1:${server.address().port}/api/voting/config`);
  await new Promise((r) => server.close(r));
  assert.equal(res.status, 404);
});
