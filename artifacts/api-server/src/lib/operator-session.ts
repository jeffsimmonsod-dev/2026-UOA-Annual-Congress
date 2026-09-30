import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import type { Request } from "express";

export interface OperatorSession {
  id: string;
  name: string;
  expiresAt: number;
}

const DURATION_MS = 12 * 60 * 60 * 1000;

function signature(payload: string): Buffer {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is required for operator sessions");
  return createHmac("sha256", secret).update(payload).digest();
}

export function createOperatorSession(name: string): { token: string; session: OperatorSession } {
  const session = { id: randomUUID(), name, expiresAt: Date.now() + DURATION_MS };
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  return { token: `${payload}.${signature(payload).toString("base64url")}`, session };
}

export function readOperatorSession(req: Request): OperatorSession | null {
  const raw = req.headers["x-operator-session"];
  if (typeof raw !== "string" || raw.length > 1024) return null;
  const parts = raw.split(".");
  if (parts.length !== 2) return null;
  try {
    const supplied = Buffer.from(parts[1], "base64url");
    const expected = signature(parts[0]);
    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null;
    const session: unknown = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
    if (!session || typeof session !== "object") return null;
    const value = session as Partial<OperatorSession>;
    if (typeof value.id !== "string" || !/^[\da-f-]{36}$/i.test(value.id) ||
        typeof value.name !== "string" || value.name.length < 1 || value.name.length > 50 ||
        typeof value.expiresAt !== "number" || value.expiresAt <= Date.now() ||
        value.expiresAt > Date.now() + DURATION_MS) return null;
    return value as OperatorSession;
  } catch {
    return null;
  }
}