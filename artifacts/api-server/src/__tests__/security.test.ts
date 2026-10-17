import { test } from "node:test";
import assert from "node:assert/strict";
import { adminPinProblem, checkAdminPin, safeEqual } from "../lib/adminAuth";
import { FailureLockout, SlidingWindowLimiter } from "../lib/rateLimit";
import { buildAllowedOrigins, isOriginAllowed } from "../lib/cors";
import { issueSignedToken, verifySignedToken } from "../lib/signedToken";

const GOOD_PIN = "correct-horse-42";

test("weak or missing admin PINs are rejected", () => {
  assert.ok(adminPinProblem(undefined));
  assert.ok(adminPinProblem(""));
  assert.ok(adminPinProblem("short1"));
  assert.ok(adminPinProblem("aaaaaaaaaaaa"));
  assert.ok(adminPinProblem("0123456789"));
  assert.ok(adminPinProblem(" padded-pin-value "));
  assert.equal(adminPinProblem(GOOD_PIN), null);
});

test("admin checks are refused when the configured PIN is weak", () => {
  const r = checkAdminPin("10.0.0.1", "short1", "short1");
  assert.deepEqual(r, { ok: false, reason: "not_configured" });
});

test("correct PIN passes, wrong PIN fails, and repeated failures lock out", () => {
  const ip = "10.0.0.2";
  assert.deepEqual(checkAdminPin(ip, GOOD_PIN, GOOD_PIN), { ok: true });
  for (let i = 0; i < 4; i++) {
    assert.equal(checkAdminPin(ip, "wrong-pin-xyz", GOOD_PIN).ok, false);
  }
  const fifth = checkAdminPin(ip, "wrong-pin-xyz", GOOD_PIN);
  assert.equal(fifth.ok, false);
  assert.equal(!fifth.ok && fifth.reason, "locked");
  // Even the right PIN is refused while locked.
  const locked = checkAdminPin(ip, GOOD_PIN, GOOD_PIN);
  assert.equal(!locked.ok && locked.reason, "locked");
  // Other IPs are unaffected.
  assert.deepEqual(checkAdminPin("10.0.0.3", GOOD_PIN, GOOD_PIN), { ok: true });
});

test("missing PIN does not count toward lockout", () => {
  const ip = "10.0.0.4";
  for (let i = 0; i < 10; i++) {
    const r = checkAdminPin(ip, undefined, GOOD_PIN);
    assert.equal(!r.ok && r.reason, "missing");
  }
  assert.deepEqual(checkAdminPin(ip, GOOD_PIN, GOOD_PIN), { ok: true });
});

test("safeEqual compares correctly", () => {
  assert.equal(safeEqual("abc", "abc"), true);
  assert.equal(safeEqual("abc", "abd"), false);
  assert.equal(safeEqual("abc", "abcd"), false);
});

test("FailureLockout unlocks after the lock period", () => {
  let now = 0;
  const l = new FailureLockout(2, 1000, 5000, () => now);
  l.recordFailure("k");
  assert.equal(l.recordFailure("k"), true);
  assert.ok(l.lockedFor("k") > 0);
  now = 5001;
  assert.equal(l.lockedFor("k"), 0);
});

test("SlidingWindowLimiter enforces the window", () => {
  let now = 0;
  const l = new SlidingWindowLimiter(2, 1000, () => now);
  assert.equal(l.tryHit("ip"), true);
  assert.equal(l.tryHit("ip"), true);
  assert.equal(l.tryHit("ip"), false);
  now = 1001;
  assert.equal(l.tryHit("ip"), true);
});

test("CORS allows native (no Origin) and known origins only", () => {
  const allowed = buildAllowedOrigins({
    REPLIT_DOMAINS: "expo-conference-hub.replit.app,other.replit.app",
    REPLIT_DEV_DOMAIN: "abc.picard.replit.dev",
    CORS_ALLOWED_ORIGINS: "https://example.org",
  });
  assert.equal(isOriginAllowed(undefined, allowed, false), true);
  assert.equal(isOriginAllowed("https://expo-conference-hub.replit.app", allowed, false), true);
  assert.equal(isOriginAllowed("https://abc.picard.replit.dev", allowed, false), true);
  assert.equal(isOriginAllowed("https://example.org", allowed, false), true);
  assert.equal(isOriginAllowed("https://evil.example", allowed, false), false);
  assert.equal(isOriginAllowed("http://localhost:8081", allowed, false), false);
  assert.equal(isOriginAllowed("http://localhost:8081", allowed, true), true);
});

test("signed voting tokens verify and resist tampering", () => {
  const secret = "s".repeat(40);
  const { token, id } = issueSignedToken(secret, "vote-device");
  assert.equal(verifySignedToken(secret, "vote-device", token), id);
  assert.equal(verifySignedToken("x".repeat(40), "vote-device", token), null);
  assert.equal(verifySignedToken(secret, "other-purpose", token), null);
  const [v, tokId, sig] = token.split(".");
  const forgedId = (tokId[0] === "A" ? "B" : "A") + tokId.slice(1);
  assert.equal(verifySignedToken(secret, "vote-device", `${v}.${forgedId}.${sig}`), null);
  assert.equal(verifySignedToken(secret, "vote-device", "dev_madeupdeviceid12345678"), null);
  assert.equal(verifySignedToken(secret, "vote-device", undefined), null);
});
