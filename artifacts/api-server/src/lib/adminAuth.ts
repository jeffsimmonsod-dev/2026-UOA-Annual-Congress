import crypto from "crypto";
import type { Request, Response } from "express";
import { FailureLockout } from "./rateLimit";
import { logger } from "./logger";

export const MIN_ADMIN_PIN_LENGTH = 10;

const MAX_FAILURES = 5;
const FAILURE_WINDOW_MS = 15 * 60 * 1000;
const LOCK_MS = 15 * 60 * 1000;

const lockout = new FailureLockout(MAX_FAILURES, FAILURE_WINDOW_MS, LOCK_MS);
setInterval(() => lockout.prune(), 5 * 60 * 1000).unref();

function isSequential(s: string): boolean {
  if (s.length < 3) return false;
  const step = s.charCodeAt(1) - s.charCodeAt(0);
  if (Math.abs(step) !== 1) return false;
  for (let i = 2; i < s.length; i++) {
    if (s.charCodeAt(i) - s.charCodeAt(i - 1) !== step) return false;
  }
  return true;
}

/** Returns a human-readable reason the PIN is unusable, or null if it is acceptable. */
export function adminPinProblem(pin: string | undefined): string | null {
  if (!pin) return "ADMIN_PIN is not set";
  if (pin.trim() !== pin) return "ADMIN_PIN must not start or end with whitespace";
  if (pin.length < MIN_ADMIN_PIN_LENGTH) {
    return `ADMIN_PIN must be at least ${MIN_ADMIN_PIN_LENGTH} characters`;
  }
  if (/^(.)\1*$/.test(pin)) return "ADMIN_PIN must not be one repeated character";
  if (isSequential(pin.toLowerCase())) return "ADMIN_PIN must not be a simple sequence";
  return null;
}

/** Constant-time string comparison (hashing first so lengths never leak). */
export function safeEqual(a: string, b: string): boolean {
  const ha = crypto.createHash("sha256").update(a, "utf8").digest();
  const hb = crypto.createHash("sha256").update(b, "utf8").digest();
  return crypto.timingSafeEqual(ha, hb);
}

export type AdminCheckResult =
  | { ok: true }
  | { ok: false; reason: "missing" | "invalid" | "locked" | "not_configured"; retryAfterSec?: number };

/**
 * Checks a candidate PIN for the given client key (normally the IP address),
 * applying the lockout. Exported separately from Express so it can be tested.
 */
export function checkAdminPin(
  clientKey: string,
  candidate: unknown,
  configuredPin: string | undefined = process.env.ADMIN_PIN,
): AdminCheckResult {
  if (adminPinProblem(configuredPin)) return { ok: false, reason: "not_configured" };

  const locked = lockout.lockedFor(clientKey);
  if (locked > 0) return { ok: false, reason: "locked", retryAfterSec: Math.ceil(locked / 1000) };

  if (typeof candidate !== "string" || candidate.length === 0) {
    return { ok: false, reason: "missing" };
  }

  if (safeEqual(candidate, configuredPin as string)) {
    lockout.recordSuccess(clientKey);
    return { ok: true };
  }

  const nowLocked = lockout.recordFailure(clientKey);
  if (nowLocked) {
    logger.warn({ ip: clientKey }, "admin PIN lockout triggered after repeated failures");
    return { ok: false, reason: "locked", retryAfterSec: Math.ceil(LOCK_MS / 1000) };
  }
  return { ok: false, reason: "invalid" };
}

export function clientIp(req: Request): string {
  // app.set("trust proxy", 1) makes req.ip the address seen by Replit's proxy,
  // not the (spoofable) left-most X-Forwarded-For entry.
  return req.ip ?? req.socket.remoteAddress ?? "unknown";
}

/** Sends the standard error response for a failed admin check. */
export function sendAdminFailure(
  res: Response,
  result: Exclude<AdminCheckResult, { ok: true }>,
  unauthorizedStatus = 401,
): void {
  if (result.reason === "not_configured") {
    res.status(503).json({ error: "Admin access is not configured on this server" });
    return;
  }
  if (result.reason === "locked") {
    res.setHeader("Retry-After", String(result.retryAfterSec ?? 900));
    res.status(429).json({ error: "Too many incorrect PIN attempts. Please wait 15 minutes and try again." });
    return;
  }
  res.status(unauthorizedStatus).json({ error: "Unauthorized" });
}

/**
 * Checks the `x-admin-pin` header. Returns true if authorized; otherwise sends
 * an error response and returns false.
 */
export function requireAdmin(req: Request, res: Response, unauthorizedStatus = 401): boolean {
  const result = checkAdminPin(clientIp(req), req.headers["x-admin-pin"]);
  if (result.ok) return true;
  sendAdminFailure(res, result, unauthorizedStatus);
  return false;
}

/** Logs a loud warning at startup if admin access will be disabled. */
export function logAdminPinStatus(): void {
  const problem = adminPinProblem(process.env.ADMIN_PIN);
  if (problem) {
    logger.error(
      { problem },
      `Admin features are DISABLED: ${problem}. Set a strong ADMIN_PIN (at least ${MIN_ADMIN_PIN_LENGTH} characters) in Replit Secrets and restart.`,
    );
  }
}
