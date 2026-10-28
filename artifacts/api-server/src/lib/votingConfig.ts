/**
 * Per-conference ballot settings (trustee candidates + how many a voter may pick).
 *
 * Stored in `congress_voting_config`, one row per conference. Conference 1
 * (2026 UOA Annual Congress) is seeded with the list that used to be
 * hard-coded in routes/voting.ts, so the live UOA app behaves the same.
 */

export interface VotingConfig {
  trusteeCandidates: string[];
  maxTrusteeSelections: number;
}

/** The 2026 UOA trustee ballot — seeded for conference 1 only. */
export const UOA_2026_CONFERENCE_ID = 1;
export const UOA_2026_VOTING_CONFIG: VotingConfig = Object.freeze({
  trusteeCandidates: Object.freeze([
    "Dr. Steven Blake",
    "Dr. Aaron King",
    "Dr. Jonathon King",
    "Dr. Taylor Linton",
  ]) as unknown as string[],
  maxTrusteeSelections: 3,
});

export const MAX_CANDIDATES = 50;
export const MAX_CANDIDATE_NAME_LENGTH = 120;

export const VOTING_NOT_CONFIGURED = {
  code: "voting_not_configured",
  error: "Voting is not configured for this conference.",
} as const;

/**
 * Validates an admin-supplied ballot config. Returns the cleaned config, or
 * an error message. Names are trimmed; order is kept (it is the ballot order).
 */
export function parseVotingConfig(body: unknown): { ok: true; config: VotingConfig } | { ok: false; error: string } {
  if (!body || typeof body !== "object") return { ok: false, error: "Body must be a JSON object" };
  const { trusteeCandidates, maxTrusteeSelections } = body as Record<string, unknown>;

  if (!Array.isArray(trusteeCandidates) || trusteeCandidates.length === 0) {
    return { ok: false, error: "trusteeCandidates must be a non-empty list of names" };
  }
  if (trusteeCandidates.length > MAX_CANDIDATES) {
    return { ok: false, error: `At most ${MAX_CANDIDATES} candidates are allowed` };
  }
  const names: string[] = [];
  for (const raw of trusteeCandidates) {
    if (typeof raw !== "string") return { ok: false, error: "Each candidate must be a string" };
    const name = raw.trim();
    if (!name) return { ok: false, error: "Candidate names cannot be empty" };
    if (name.length > MAX_CANDIDATE_NAME_LENGTH) {
      return { ok: false, error: `Candidate names must be at most ${MAX_CANDIDATE_NAME_LENGTH} characters` };
    }
    if (names.includes(name)) return { ok: false, error: `Duplicate candidate: ${name}` };
    names.push(name);
  }

  if (
    typeof maxTrusteeSelections !== "number" ||
    !Number.isInteger(maxTrusteeSelections) ||
    maxTrusteeSelections < 1 ||
    maxTrusteeSelections > names.length
  ) {
    return { ok: false, error: `maxTrusteeSelections must be a whole number from 1 to ${names.length}` };
  }

  return { ok: true, config: { trusteeCandidates: names, maxTrusteeSelections } };
}

/** Checks a voter's trustee picks against the conference's ballot. */
export function checkTrusteeVotes(config: VotingConfig, trusteeVotes: unknown): { ok: true; votes: string[] } | { ok: false; error: string } {
  const votes = Array.isArray(trusteeVotes) ? trusteeVotes : [];
  if (votes.length > config.maxTrusteeSelections) {
    return { ok: false, error: `You may select at most ${config.maxTrusteeSelections} trustee candidates` };
  }
  if (new Set(votes).size !== votes.length) {
    return { ok: false, error: "Each trustee candidate may be selected only once" };
  }
  if (votes.some((v) => typeof v !== "string" || !config.trusteeCandidates.includes(v))) {
    return { ok: false, error: "Invalid trustee candidate" };
  }
  return { ok: true, votes: votes as string[] };
}

export function sameCandidates(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((name, i) => name === b[i]);
}
