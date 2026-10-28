import { Router } from "express";
import { pool } from "../lib/db";
import { logger } from "../lib/logger";
import { ensureConferencesTable } from "../lib/ensureConferences";
import { clientIp, requireAdmin } from "../lib/adminAuth";
import { SlidingWindowLimiter, envInt } from "../lib/rateLimit";
import { issueSignedToken, verifySignedToken } from "../lib/signedToken";
import { getVoteTokenSecret } from "../lib/serverSecret";
import {
  UOA_2026_CONFERENCE_ID,
  UOA_2026_VOTING_CONFIG,
  VOTING_NOT_CONFIGURED,
  checkTrusteeVotes,
  parseVotingConfig,
  sameCandidates,
  type VotingConfig,
} from "../lib/votingConfig";

const router = Router();

/*
 * How "one vote per device" works:
 *  - The app asks the server for a voting token (POST /voting/device). The
 *    server makes up a random ID and signs it, together with the conference
 *    ID, using a secret only the server knows (HMAC). The app stores it.
 *  - A vote is only accepted with a valid token for *this* conference, and
 *    each token can vote once. Made-up device IDs are no longer accepted.
 *  - Issuing tokens and submitting votes are rate limited per conference + IP.
 *
 * Limits (honest version): someone can still delete the app / clear storage
 * and fetch a new token, up to the per-IP limits. True one-person-one-vote
 * needs attendee identity (e.g. a badge code or member number per voter).
 */
const TOKEN_ID_PREFIX = "t:";
const HOUR_MS = 60 * 60 * 1000;

function tokenPurpose(conferenceId: number): string {
  return `vote-device:${conferenceId}`;
}

// Business meetings often have everyone on the same venue wifi, so these are
// per-IP ceilings, not per-person. Tune with env vars if needed.
const deviceTokenLimiter = new SlidingWindowLimiter(envInt("VOTE_DEVICE_TOKENS_PER_IP_PER_HOUR", 200), HOUR_MS);
const submitLimiter = new SlidingWindowLimiter(envInt("VOTE_SUBMISSIONS_PER_IP_PER_HOUR", 200), HOUR_MS);
setInterval(() => {
  deviceTokenLimiter.prune();
  submitLimiter.prune();
}, 5 * 60 * 1000).unref();

function limiterKey(req: { conferenceId: number } & Parameters<typeof clientIp>[0]): string {
  return `${req.conferenceId}:${clientIp(req)}`;
}

async function voterKeyFromToken(conferenceId: number, token: unknown): Promise<string | null> {
  const secret = await getVoteTokenSecret();
  const id = verifySignedToken(secret, tokenPurpose(conferenceId), token);
  return id ? TOKEN_ID_PREFIX + id : null;
}

// Trustee candidates and the max-picks limit are per conference
// (table congress_voting_config, see lib/votingConfig.ts).
async function getVotingConfig(conferenceId: number): Promise<VotingConfig | null> {
  const { rows } = await pool.query(
    `SELECT trustee_candidates, max_trustee_selections FROM congress_voting_config WHERE conference_id = $1`,
    [conferenceId]
  );
  if (rows.length === 0) return null;
  const candidates = (rows[0].trustee_candidates ?? []) as string[];
  if (candidates.length === 0) return null;
  return { trusteeCandidates: candidates, maxTrusteeSelections: Number(rows[0].max_trustee_selections) };
}

async function isVotingOpen(conferenceId: number): Promise<boolean> {
  const { rows } = await pool.query("SELECT is_open FROM congress_voting_state WHERE conference_id = $1", [conferenceId]);
  return rows[0]?.is_open ?? false;
}

const SLATE_OPTIONS = ["approve", "disapprove", "abstain"] as const;

async function ensureTables() {
  // Ensure the full conferences table exists before adding FKs to it
  await ensureConferencesTable().catch(() => {});

  await pool.query(`
    CREATE TABLE IF NOT EXISTS congress_voting_state (
      id INTEGER PRIMARY KEY DEFAULT 1,
      is_open BOOLEAN NOT NULL DEFAULT false,
      CHECK (id = 1)
    );
    INSERT INTO congress_voting_state (id, is_open)
    VALUES (1, false)
    ON CONFLICT (id) DO NOTHING;

    CREATE TABLE IF NOT EXISTS congress_votes (
      id SERIAL PRIMARY KEY,
      device_id TEXT NOT NULL UNIQUE,
      slate_vote TEXT NOT NULL,
      trustee_votes TEXT[] NOT NULL DEFAULT '{}',
      submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    ALTER TABLE congress_voting_state DROP CONSTRAINT IF EXISTS congress_voting_state_id_check
  `).catch(() => {});

  await pool.query(`
    ALTER TABLE congress_voting_state
      ADD COLUMN IF NOT EXISTS conference_id INTEGER NOT NULL DEFAULT 1
  `).catch(() => {});

  await pool.query(`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_voting_state_conference'
      ) THEN
        ALTER TABLE congress_voting_state
          ADD CONSTRAINT uq_voting_state_conference UNIQUE (conference_id);
      END IF;
    END $$;
  `).catch(() => {});

  await pool.query(`
    INSERT INTO congress_voting_state (conference_id, is_open)
    VALUES (1, false)
    ON CONFLICT (conference_id) DO NOTHING
  `).catch(() => {});

  await pool.query(`
    ALTER TABLE congress_votes
      ADD COLUMN IF NOT EXISTS conference_id INTEGER NOT NULL DEFAULT 1
  `).catch(() => {});

  await pool.query(`
    DO $$ BEGIN
      IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'congress_votes_device_id_key'
        AND conrelid = 'congress_votes'::regclass
      ) THEN
        ALTER TABLE congress_votes DROP CONSTRAINT congress_votes_device_id_key;
      END IF;
    END $$;
  `).catch(() => {});

  await pool.query(`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_votes_conf_device'
      ) THEN
        ALTER TABLE congress_votes
          ADD CONSTRAINT uq_votes_conf_device UNIQUE (conference_id, device_id);
      END IF;
    END $$;
  `).catch(() => {});

  await pool.query(`
    DO $$ BEGIN
      ALTER TABLE congress_voting_state
        ADD CONSTRAINT fk_voting_state_conf
        FOREIGN KEY (conference_id) REFERENCES conferences(id);
    EXCEPTION WHEN others THEN NULL; END $$;
  `).catch(() => {});
  await pool.query(`
    DO $$ BEGIN
      ALTER TABLE congress_votes
        ADD CONSTRAINT fk_votes_conf
        FOREIGN KEY (conference_id) REFERENCES conferences(id);
    EXCEPTION WHEN others THEN NULL; END $$;
  `).catch(() => {});

  // Per-conference ballot settings. Seeded once (when the table is first
  // created) with the 2026 UOA ballot for conference 1, so admins can later
  // edit or remove it without a restart putting it back.
  const existed = await pool.query(`SELECT to_regclass('congress_voting_config') IS NOT NULL AS ok`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS congress_voting_config (
      conference_id          INTEGER PRIMARY KEY,
      trustee_candidates     TEXT[] NOT NULL,
      max_trustee_selections INTEGER NOT NULL CHECK (max_trustee_selections >= 1),
      updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  if (!existed.rows[0]?.ok) {
    await pool.query(
      `INSERT INTO congress_voting_config (conference_id, trustee_candidates, max_trustee_selections)
       SELECT $1::int, $2::text[], $3::int
       WHERE EXISTS (SELECT 1 FROM conferences WHERE id = $1::int)
       ON CONFLICT (conference_id) DO NOTHING`,
      [UOA_2026_CONFERENCE_ID, UOA_2026_VOTING_CONFIG.trusteeCandidates, UOA_2026_VOTING_CONFIG.maxTrusteeSelections]
    );
  }
  await pool.query(`
    DO $$ BEGIN
      ALTER TABLE congress_voting_config
        ADD CONSTRAINT fk_voting_config_conf
        FOREIGN KEY (conference_id) REFERENCES conferences(id);
    EXCEPTION WHEN others THEN NULL; END $$;
  `).catch(() => {});

  // Replace the hard-coded DEFAULT 1 on congress_voting_state.id with a proper sequence
  // so multiple conference rows can exist (multi-tenancy).
  await pool.query(`
    DO $$ BEGIN
      CREATE SEQUENCE IF NOT EXISTS congress_voting_state_id_seq;
      ALTER TABLE congress_voting_state
        ALTER COLUMN id SET DEFAULT nextval('congress_voting_state_id_seq');
      PERFORM setval(
        'congress_voting_state_id_seq',
        GREATEST((SELECT MAX(id) FROM congress_voting_state), 1)
      );
    EXCEPTION WHEN others THEN NULL; END $$;
  `).catch(() => {});
}

// One shared setup promise, so parallel first requests (the app asks for
// state, status and config at once) don't run the migration concurrently.
let tablesReady: Promise<void> | null = null;
async function withTables<T>(fn: () => Promise<T>): Promise<T> {
  if (!tablesReady) {
    tablesReady = ensureTables().catch((err) => {
      tablesReady = null;
      throw err;
    });
  }
  await tablesReady;
  return fn();
}

router.get("/voting/state", async (req, res) => {
  try {
    await withTables(async () => {
      const [isOpen, config] = await Promise.all([isVotingOpen(req.conferenceId), getVotingConfig(req.conferenceId)]);
      res.json({ isOpen, configured: config !== null });
    });
  } catch (err) {
    req.log.error({ err }, "voting state error");
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/voting/device — issue a server-signed voting token for this device + conference
// GET /api/voting/config — this conference's ballot (public; the app shows it).
router.get("/voting/config", async (req, res) => {
  try {
    await withTables(async () => {
      const config = await getVotingConfig(req.conferenceId);
      if (!config) {
        res.status(404).json({ configured: false, ...VOTING_NOT_CONFIGURED });
        return;
      }
      res.json({ configured: true, ...config });
    });
  } catch (err) {
    req.log.error({ err }, "voting config error");
    res.status(500).json({ error: "Server error" });
  }
});

// PUT /api/voting/config — admin: set this conference's candidates and max picks.
// Body: { trusteeCandidates: string[], maxTrusteeSelections: number, force?: boolean }
// Refused while voting is open. Changing the candidate list after votes were
// cast needs force: true (or reset voting first) so results stay meaningful.
router.put("/voting/config", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const parsed = parseVotingConfig(req.body);
  if (!parsed.ok) {
    res.status(400).json({ error: parsed.error });
    return;
  }
  const force = (req.body as { force?: unknown })?.force === true;
  try {
    await withTables(async () => {
      if (await isVotingOpen(req.conferenceId)) {
        res.status(409).json({ code: "voting_open", error: "Close voting before changing the ballot." });
        return;
      }
      const current = await getVotingConfig(req.conferenceId);
      if (!force && current && !sameCandidates(current.trusteeCandidates, parsed.config.trusteeCandidates)) {
        const votes = await pool.query("SELECT 1 FROM congress_votes WHERE conference_id = $1 LIMIT 1", [req.conferenceId]);
        if (votes.rows.length > 0) {
          res.status(409).json({
            code: "votes_exist",
            error: "Votes have already been cast. Reset voting first, or send force: true to change the candidates anyway.",
          });
          return;
        }
      }
      await pool.query(
        `INSERT INTO congress_voting_config (conference_id, trustee_candidates, max_trustee_selections, updated_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (conference_id) DO UPDATE
           SET trustee_candidates = EXCLUDED.trustee_candidates,
               max_trustee_selections = EXCLUDED.max_trustee_selections,
               updated_at = NOW()`,
        [req.conferenceId, parsed.config.trusteeCandidates, parsed.config.maxTrusteeSelections]
      );
      logger.info({ conferenceId: req.conferenceId, candidates: parsed.config.trusteeCandidates.length }, "voting config updated");
      res.json({ success: true, configured: true, ...parsed.config });
    });
  } catch (err: any) {
    if (err?.code === "23503") {
      res.status(404).json({ error: "Conference not found" });
      return;
    }
    req.log.error({ err }, "voting config update error");
    res.status(500).json({ error: "Server error" });
  }
});

// DELETE /api/voting/config — admin: remove this conference's ballot (voting becomes "not configured").
router.delete("/voting/config", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    await withTables(async () => {
      if (await isVotingOpen(req.conferenceId)) {
        res.status(409).json({ code: "voting_open", error: "Close voting before removing the ballot." });
        return;
      }
      await pool.query("DELETE FROM congress_voting_config WHERE conference_id = $1", [req.conferenceId]);
      logger.warn({ conferenceId: req.conferenceId }, "voting config removed");
      res.json({ success: true, configured: false });
    });
  } catch (err) {
    req.log.error({ err }, "voting config delete error");
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/voting/device", async (req, res) => {
  if (!deviceTokenLimiter.tryHit(limiterKey(req))) {
    res.status(429).json({ error: "Too many requests from this network. Please try again in a few minutes." });
    return;
  }
  try {
    const secret = await getVoteTokenSecret();
    const { token } = issueSignedToken(secret, tokenPurpose(req.conferenceId));
    res.json({ votingToken: token });
  } catch (err) {
    req.log.error({ err }, "voting device token error");
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/voting/status — has this device's token already voted? (token in x-voting-token header)
router.get("/voting/status", async (req, res) => {
  try {
    const key = await voterKeyFromToken(req.conferenceId, req.headers["x-voting-token"]);
    if (!key) {
      res.status(401).json({ error: "Invalid voting token" });
      return;
    }
    await withTables(async () => {
      const result = await pool.query(
        "SELECT 1 FROM congress_votes WHERE conference_id = $1 AND device_id = $2",
        [req.conferenceId, key]
      );
      res.json({ hasVoted: result.rows.length > 0 });
    });
  } catch (err) {
    req.log.error({ err }, "voting status error");
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/voting/status/:deviceId — legacy (older app builds). Only says whether
// that ID voted; no longer returns the ballot choices.
router.get("/voting/status/:deviceId", async (req, res) => {
  const deviceId = String(req.params.deviceId ?? "");
  if (!deviceId) {
    res.status(400).json({ error: "deviceId required" });
    return;
  }
  try {
    await withTables(async () => {
      const result = await pool.query(
        "SELECT 1 FROM congress_votes WHERE conference_id = $1 AND device_id = $2",
        [req.conferenceId, deviceId]
      );
      res.json({ hasVoted: result.rows.length > 0 });
    });
  } catch (err) {
    req.log.error({ err }, "voting status error");
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/voting/submit", async (req, res) => {
  const { votingToken, deviceId, slateVote, trusteeVotes } = req.body as {
    votingToken?: string;
    deviceId?: string;
    slateVote?: string;
    trusteeVotes?: string[];
  };

  if (!votingToken) {
    if (deviceId) {
      // Older app builds send a self-generated deviceId, which is trivially forged.
      res.status(426).json({ error: "Please update the conference app to the latest version to vote." });
    } else {
      res.status(400).json({ error: "votingToken is required" });
    }
    return;
  }

  if (!submitLimiter.tryHit(limiterKey(req))) {
    res.status(429).json({ error: "Too many votes from this network. Please try again in a few minutes." });
    return;
  }

  if (!slateVote || !SLATE_OPTIONS.includes(slateVote as any)) {
    res.status(400).json({ error: "slateVote must be approve, disapprove, or abstain" });
    return;
  }

  try {
    const config = await withTables(() => getVotingConfig(req.conferenceId));
    if (!config) {
      res.status(404).json(VOTING_NOT_CONFIGURED);
      return;
    }
    const checked = checkTrusteeVotes(config, trusteeVotes);
    if (!checked.ok) {
      res.status(400).json({ error: checked.error });
      return;
    }
    const trustees = checked.votes;

    const voterKey = await voterKeyFromToken(req.conferenceId, votingToken);
    if (!voterKey) {
      res.status(401).json({ error: "Invalid voting token. Please close and reopen the voting screen." });
      return;
    }

    await withTables(async () => {
      const stateResult = await pool.query(
        "SELECT is_open FROM congress_voting_state WHERE conference_id = $1",
        [req.conferenceId]
      );
      if (!stateResult.rows[0]?.is_open) {
        res.status(403).json({ error: "Voting is currently closed." });
        return;
      }

      try {
        await pool.query(
          `INSERT INTO congress_votes (device_id, slate_vote, trustee_votes, conference_id)
           VALUES ($1, $2, $3, $4)`,
          [voterKey, slateVote, trustees, req.conferenceId]
        );
        // Deliberately not logging the voter key or the choices together.
        logger.info({ conferenceId: req.conferenceId }, "vote submitted");
        res.json({ success: true });
      } catch (err: any) {
        if (err?.code === "23505") {
          res.status(409).json({ error: "You have already submitted your vote." });
        } else {
          throw err;
        }
      }
    });
  } catch (err) {
    req.log.error({ err }, "voting submit error");
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/voting/results", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    await withTables(async () => {
      const [config, stateResult, totalResult, slateResult, trusteeResult] = await Promise.all([
        getVotingConfig(req.conferenceId),
        pool.query("SELECT is_open FROM congress_voting_state WHERE conference_id = $1", [req.conferenceId]),
        pool.query("SELECT COUNT(*) AS count FROM congress_votes WHERE conference_id = $1", [req.conferenceId]),
        pool.query(`
          SELECT slate_vote, COUNT(*) AS count
          FROM congress_votes
          WHERE conference_id = $1
          GROUP BY slate_vote
        `, [req.conferenceId]),
        pool.query("SELECT trustee_votes FROM congress_votes WHERE conference_id = $1", [req.conferenceId]),
      ]);

      const isOpen: boolean = stateResult.rows[0]?.is_open ?? false;
      const totalVotes = parseInt(totalResult.rows[0]?.count ?? "0");

      const slateMap: Record<string, number> = { approve: 0, disapprove: 0, abstain: 0 };
      for (const row of slateResult.rows) {
        slateMap[row.slate_vote] = parseInt(row.count);
      }

      const trusteeMap: Record<string, number> = Object.create(null);
      for (const candidate of config?.trusteeCandidates ?? []) {
        trusteeMap[candidate] = 0;
      }
      for (const row of trusteeResult.rows) {
        for (const candidate of row.trustee_votes as string[]) {
          if (candidate in trusteeMap) {
            trusteeMap[candidate]++;
          }
        }
      }

      res.json({
        isOpen,
        totalVotes,
        slateResults: slateMap,
        trusteeResults: trusteeMap,
        configured: config !== null,
        trusteeCandidates: config?.trusteeCandidates ?? [],
        maxTrusteeSelections: config?.maxTrusteeSelections ?? 0,
      });
    });
  } catch (err) {
    req.log.error({ err }, "voting results error");
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/voting/open", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    await withTables(async () => {
      if (!(await getVotingConfig(req.conferenceId))) {
        res.status(409).json({ ...VOTING_NOT_CONFIGURED, error: "Set up the ballot (trustee candidates) before opening voting." });
        return;
      }
      await pool.query(
        `INSERT INTO congress_voting_state (conference_id, is_open) VALUES ($1, true)
         ON CONFLICT (conference_id) DO UPDATE SET is_open = true`,
        [req.conferenceId]
      );
      res.json({ success: true, isOpen: true });
    });
  } catch (err) {
    req.log.error({ err }, "voting open error");
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/voting/close", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    await withTables(async () => {
      await pool.query(
        `INSERT INTO congress_voting_state (conference_id, is_open) VALUES ($1, false)
         ON CONFLICT (conference_id) DO UPDATE SET is_open = false`,
        [req.conferenceId]
      );
      res.json({ success: true, isOpen: false });
    });
  } catch (err) {
    req.log.error({ err }, "voting close error");
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/voting/reset", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    await withTables(async () => {
      await pool.query("DELETE FROM congress_votes WHERE conference_id = $1", [req.conferenceId]);
      await pool.query(
        `INSERT INTO congress_voting_state (conference_id, is_open) VALUES ($1, false)
         ON CONFLICT (conference_id) DO UPDATE SET is_open = false`,
        [req.conferenceId]
      );
      logger.warn("Voting reset by admin");
      res.json({ success: true });
    });
  } catch (err) {
    req.log.error({ err }, "voting reset error");
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
