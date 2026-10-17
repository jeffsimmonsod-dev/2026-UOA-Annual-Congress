import { Router } from "express";
import { pool } from "../lib/db";
import { logger } from "../lib/logger";
import { ensureConferencesTable } from "../lib/ensureConferences";
import { clientIp, requireAdmin } from "../lib/adminAuth";
import { SlidingWindowLimiter, envInt } from "../lib/rateLimit";
import { issueSignedToken, verifySignedToken } from "../lib/signedToken";
import { getVoteTokenSecret } from "../lib/serverSecret";

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

const TRUSTEE_CANDIDATES = [
  "Dr. Steven Blake",
  "Dr. Aaron King",
  "Dr. Jonathon King",
  "Dr. Taylor Linton",
];

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

let tablesReady = false;
async function withTables<T>(fn: () => Promise<T>): Promise<T> {
  if (!tablesReady) {
    await ensureTables();
    tablesReady = true;
  }
  return fn();
}

router.get("/voting/state", async (req, res) => {
  try {
    await withTables(async () => {
      const result = await pool.query(
        "SELECT is_open FROM congress_voting_state WHERE conference_id = $1",
        [req.conferenceId]
      );
      const isOpen = result.rows[0]?.is_open ?? false;
      res.json({ isOpen });
    });
  } catch (err) {
    req.log.error({ err }, "voting state error");
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/voting/device — issue a server-signed voting token for this device + conference
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
  const trustees = Array.isArray(trusteeVotes) ? trusteeVotes : [];
  if (trustees.length > 3) {
    res.status(400).json({ error: "You may select at most 3 trustee candidates" });
    return;
  }
  if (new Set(trustees).size !== trustees.length) {
    res.status(400).json({ error: "Each trustee candidate may be selected only once" });
    return;
  }
  const invalidTrustee = trustees.find((t) => !TRUSTEE_CANDIDATES.includes(t));
  if (invalidTrustee) {
    res.status(400).json({ error: "Invalid trustee candidate" });
    return;
  }

  try {
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
      const [stateResult, totalResult, slateResult, trusteeResult] = await Promise.all([
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

      const trusteeMap: Record<string, number> = {};
      for (const candidate of TRUSTEE_CANDIDATES) {
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
