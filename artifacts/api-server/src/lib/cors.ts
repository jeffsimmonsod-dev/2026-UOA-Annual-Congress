import type { CorsOptions } from "cors";

type Env = Record<string, string | undefined>;

function toOrigin(value: string): string | null {
  const v = value.trim();
  if (!v) return null;
  const withScheme = /^https?:\/\//i.test(v) ? v : `https://${v}`;
  try {
    return new URL(withScheme).origin;
  } catch {
    return null;
  }
}

/**
 * Builds the set of browser origins allowed to call the API:
 * - every domain in REPLIT_DOMAINS (comma-separated; set by Replit deployments)
 * - REPLIT_DEV_DOMAIN / REPLIT_EXPO_DEV_DOMAIN (Replit workspace preview, Expo web dev)
 * - EXPO_PUBLIC_DOMAIN, if set
 * - anything in CORS_ALLOWED_ORIGINS (comma-separated), for extra hosts
 *
 * The admin dashboard is served from the same domain as the API (path
 * /admin-dashboard/), so it is covered by the deployment/dev domains above.
 * If it is ever hosted elsewhere, add its origin to CORS_ALLOWED_ORIGINS.
 */
export function buildAllowedOrigins(env: Env = process.env): Set<string> {
  const origins = new Set<string>();
  const add = (v: string | undefined) => {
    if (!v) return;
    for (const part of v.split(",")) {
      const o = toOrigin(part);
      if (o) origins.add(o);
    }
  };
  add(env.REPLIT_DOMAINS);
  add(env.REPLIT_DEV_DOMAIN);
  add(env.REPLIT_EXPO_DEV_DOMAIN);
  add(env.EXPO_PUBLIC_DOMAIN);
  add(env.CORS_ALLOWED_ORIGINS);
  return origins;
}

export function isOriginAllowed(
  origin: string | undefined,
  allowed: Set<string>,
  allowLocalhost: boolean,
): boolean {
  // Native iOS/Android apps (and server-to-server calls) send no Origin header.
  // CORS is a browser protection, so those requests are always let through.
  if (!origin) return true;
  if (allowed.has(origin)) return true;
  if (allowLocalhost && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return true;
  return false;
}

export function corsOptions(env: Env = process.env): CorsOptions {
  const allowed = buildAllowedOrigins(env);
  const allowLocalhost = env.NODE_ENV !== "production";
  return {
    origin(origin, callback) {
      // For a disallowed origin we simply omit CORS headers (the browser then
      // blocks the response) rather than throwing a server error.
      callback(null, isOriginAllowed(origin, allowed, allowLocalhost));
    },
  };
}
