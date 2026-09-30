import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import type { Request, Response } from "express";
import { createOperatorSession, readOperatorSession } from "./operator-session";
import communityRouter from "../routes/community";
import adminRouter from "../routes/admin";
import { pool } from "./db";

// Test-only credentials. Never read the workspace's real secrets.
process.env.SESSION_SECRET = "operator-session-test-secret";
process.env.ADMIN_PIN = "operator-session-test-pin";

function request(token?: string): Request {
  return { headers: token ? { "x-operator-session": token } : {} } as Request;
}

test("session carries only the signed name, session ID and expiry, never the PIN", () => {
  const first = createOperatorSession("Organizer One");
  const second = createOperatorSession("Organizer One");
  assert.equal(readOperatorSession(request(first.token))?.name, "Organizer One");
  assert.notEqual(first.session.id, second.session.id);
  const payload = JSON.parse(Buffer.from(first.token.split(".")[0], "base64url").toString());
  assert.deepEqual(Object.keys(payload).sort(), ["expiresAt", "id", "name"]);
});

test("missing, modified, malformed and expired sessions are rejected", () => {
  const { token, session } = createOperatorSession("Organizer One");
  assert.equal(readOperatorSession(request()), null);
  assert.equal(readOperatorSession(request("broken")), null);
  const altered = Buffer.from(JSON.stringify({ ...session, name: "Organizer Two" })).toString("base64url");
  assert.equal(readOperatorSession(request(`${altered}.${token.split(".")[1]}`)), null);
  const expired = Buffer.from(JSON.stringify({ ...session, expiresAt: Date.now() - 1000 })).toString("base64url");
  const signature = createHmac("sha256", "operator-session-test-secret").update(expired).digest("base64url");
  assert.equal(readOperatorSession(request(`${expired}.${signature}`)), null);
});

test("sign-in issues a named session only after PIN verification; legacy verification stays compatible", async () => {
  const route = adminRouter.stack.find(layer => layer.route?.path === "/admin/verify")?.route;
  assert.ok(route);
  const signIn = route.stack[0].handle;
  assert.ok(signIn);
  const named = response();
  await signIn({ body: { pin: "operator-session-test-pin", name: "  Organizer One  " } } as Request, named.res, () => {});
  const data = named.body() as { operatorSession: string; operatorName: string };
  assert.equal(data.operatorName, "Organizer One");
  assert.equal(readOperatorSession(request(data.operatorSession))?.name, "Organizer One");
  const invalid = response();
  await signIn({ body: { pin: "wrong", name: "Organizer One" } } as Request, invalid.res, () => {});
  assert.equal(invalid.status(), 401);
  const blank = response();
  await signIn({ body: { pin: "operator-session-test-pin", name: " " } } as Request, blank.res, () => {});
  assert.equal(blank.status(), 400);
  const legacy = response();
  await signIn({ body: { pin: "operator-session-test-pin" } } as Request, legacy.res, () => {});
  assert.deepEqual(legacy.body(), { valid: true });
});

function handler(path: string) {
  const layer = communityRouter.stack.find(layer => layer.route?.path === path);
  assert.ok(layer?.route);
  return layer.route.stack[0].handle;
}

function response() {
  let status = 200;
  let body: unknown;
  const res = {
    status(code: number) { status = code; return res; },
    json(value: unknown) { body = value; return res; },
  } as unknown as Response;
  return { res, status: () => status, body: () => body };
}

const decisions = [
  { path: "/community/admin/content", body: { type: "discussion", id: 1, hidden: true } },
  { path: "/community/admin/users", body: { sessionToken: "attendee", restricted: true } },
  { path: "/community/admin/reports/:id", body: { status: "resolved" } },
  { path: "/community/admin/settings", body: { cutoffAt: "2026-10-01T12:00:00.000Z" } },
];

test("every decision endpoint refuses a shared PIN without an operator session", async () => {
  for (const item of decisions) {
    const result = response();
    await handler(item.path)({
      headers: { "x-admin-pin": "operator-session-test-pin" },
      body: { ...item.body, reason: "Review" }, params: { id: "1" }, conferenceId: 1,
    } as unknown as Request, result.res, () => {});
    assert.equal(result.status(), 401, item.path);
  }
});

test("all decisions record the authenticated session identity, not a caller-supplied actor", async () => {
  const auditRows: unknown[][] = [];
  const client = {
    async query(sql: string, params?: unknown[]) {
      if (sql.includes("INSERT INTO community_admin_actions")) auditRows.push(params!);
      return { rowCount: 1, rows: [{ hidden: false, restricted: false, status: "pending", cutoff_at: null }] };
    },
    release() {},
  };
  const original = pool.connect;
  pool.connect = (async () => client) as unknown as typeof pool.connect;
  try {
    for (const [index, item] of decisions.entries()) {
      const { token, session } = createOperatorSession(`Organizer ${index + 1}`);
      const result = response();
      await handler(item.path)({
        headers: { "x-operator-session": token },
        body: { ...item.body, reason: "Review", actorLabel: "Spoofed name" },
        params: { id: "1" }, conferenceId: 2,
        log: { error() {} },
      } as unknown as Request, result.res, () => {});
      assert.equal(result.status(), 200, `${item.path}: ${JSON.stringify(result.body())}`);
      assert.equal(auditRows[index][0], 2);
      assert.equal(auditRows[index][7], session.name);
      assert.equal(auditRows[index][8], session.id);
      assert.ok(!auditRows[index].includes("operator-session-test-pin"));
    }
  } finally {
    pool.connect = original;
    await pool.end();
  }
});