import conferenceConfig from "@/conference.config";

export function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = new Headers();
  const existing = options.headers;
  if (existing) {
    if (existing instanceof Headers) {
      existing.forEach((val, key) => headers.set(key, val));
    } else if (Array.isArray(existing)) {
      for (const [key, val] of existing) {
        headers.set(key, val);
      }
    } else {
      for (const [key, val] of Object.entries(existing as Record<string, string>)) {
        headers.set(key, val);
      }
    }
  }
  headers.set("X-Conference-Id", String(conferenceConfig.conferenceId));
  return fetch(url, { ...options, headers });
}

/** Thrown by apiFetchWithTimeout when the server does not answer in time. */
export class RequestTimeoutError extends Error {
  constructor(readonly timeoutMs: number) {
    super(`The server did not respond within ${Math.round(timeoutMs / 1000)} seconds.`);
    this.name = "RequestTimeoutError";
  }
}

/**
 * apiFetch that gives up after `timeoutMs`. fetch() has no timeout of its own,
 * so on a stalled connection (or a server that is still waking up) it can wait
 * for minutes.
 */
export async function apiFetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 10_000,
): Promise<Response> {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
  try {
    return await apiFetch(url, { ...options, signal: controller.signal });
  } catch (err) {
    if (timedOut) throw new RequestTimeoutError(timeoutMs);
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/** Rejects with RequestTimeoutError if `promise` has not settled within `timeoutMs`. */
export function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new RequestTimeoutError(timeoutMs)), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
