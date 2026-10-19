/**
 * Small in-memory rate limiting helpers.
 *
 * State lives in this server process only. That is fine for a single Replit
 * deployment instance; if the API is ever scaled to several instances, each
 * instance keeps its own counters (limits become per-instance).
 */

type Clock = () => number;

/** Sliding-window counter: allow at most `max` hits per `windowMs` per key. */
export class SlidingWindowLimiter {
  private hits = new Map<string, number[]>();

  constructor(
    private readonly max: number,
    private readonly windowMs: number,
    private readonly now: Clock = Date.now,
  ) {}

  /** Records a hit and returns true if it is allowed, false if over the limit. */
  tryHit(key: string): boolean {
    const t = this.now();
    const fresh = (this.hits.get(key) ?? []).filter((ts) => t - ts < this.windowMs);
    if (fresh.length >= this.max) {
      this.hits.set(key, fresh);
      return false;
    }
    fresh.push(t);
    this.hits.set(key, fresh);
    return true;
  }

  prune(): void {
    const t = this.now();
    for (const [key, ts] of this.hits) {
      const fresh = ts.filter((x) => t - x < this.windowMs);
      if (fresh.length === 0) this.hits.delete(key);
      else this.hits.set(key, fresh);
    }
  }
}

/**
 * Failure-based lockout: after `maxFailures` failures within `windowMs`,
 * the key is locked for `lockMs`. A success clears the key.
 */
export class FailureLockout {
  private failures = new Map<string, number[]>();
  private lockedUntil = new Map<string, number>();

  constructor(
    private readonly maxFailures: number,
    private readonly windowMs: number,
    private readonly lockMs: number,
    private readonly now: Clock = Date.now,
  ) {}

  /** Milliseconds until the key is unlocked, or 0 if it is not locked. */
  lockedFor(key: string): number {
    const until = this.lockedUntil.get(key);
    if (!until) return 0;
    const remaining = until - this.now();
    if (remaining <= 0) {
      this.lockedUntil.delete(key);
      return 0;
    }
    return remaining;
  }

  /** Records a failure. Returns true if this failure triggered a lock. */
  recordFailure(key: string): boolean {
    const t = this.now();
    const fresh = (this.failures.get(key) ?? []).filter((ts) => t - ts < this.windowMs);
    fresh.push(t);
    if (fresh.length >= this.maxFailures) {
      this.failures.delete(key);
      this.lockedUntil.set(key, t + this.lockMs);
      return true;
    }
    this.failures.set(key, fresh);
    return false;
  }

  recordSuccess(key: string): void {
    this.failures.delete(key);
    this.lockedUntil.delete(key);
  }

  prune(): void {
    const t = this.now();
    for (const [key, ts] of this.failures) {
      const fresh = ts.filter((x) => t - x < this.windowMs);
      if (fresh.length === 0) this.failures.delete(key);
      else this.failures.set(key, fresh);
    }
    for (const [key, until] of this.lockedUntil) {
      if (until <= t) this.lockedUntil.delete(key);
    }
  }
}

/** Reads a positive integer from an env var, falling back to `fallback`. */
export function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}
