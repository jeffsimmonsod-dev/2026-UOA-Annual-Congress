import { Router } from "express";
import { pool } from "../lib/db";
import { logger } from "../lib/logger";
import { clientIp, requireAdmin } from "../lib/adminAuth";
import { SlidingWindowLimiter, envInt } from "../lib/rateLimit";
import { issueSignedToken, verifySignedToken } from "../lib/signedToken";
import { getVoteTokenSecret } from "../lib/serverSecret";

const router = Router();

/*
 * How "one vote per device" works now:
 *  - The app asks the server for a voting token (POST /voting/device). The
 *    server makes up a random ID and signs it with a secret only the server
 *    knows (HMAC). The app stores that token.
 *  - A vote is only accepted with a valid signed token, and each token can
 *    vote once. Made-up device IDs are no longer accepted.
 *  - Issuing tokens and submitting votes are both rate limited per IP.
 *
 * Limits (honest version): someone can still delete the app / clear storage
 * and fetch a new token, up to the per-IP limits. True one-person-one-vote
 * needs attendee identity (e.g. a badge code or member number per voter).
 */
const TOKEN_PURPOSE = "vote-device";
const TOKEN_ID_PREFIX = "t:";
const HOUR_MS = 60 * 60 * 1000;

// Business meetings often have everyone on the same venue wifi, so these are
// per-IP ceilings, not per-person. Tune with env vars if needed.
const deviceTokenLimiter = new SlidingWindowLimiter(envInt("VOTE_DEVICE_TOKENS_PER_IP_PER_HOUR", 200), HOUR_MS);
const submitLimiter = new SlidingWindowLimiter(envInt("VOTE_SUBMISSIONS_PER_IP_PER_HOUR", 200), HOUR_MS);
setInterval(() => {
  deviceTokenLimiter.prune();
  submitLimiter.prune();
}, 5 * 60 * 1000).unref();

async function voterKeyFromToken(token: unknown): Promise<string | null> {
  const secret = await getVoteTokenSecret();
  const id = verifySignedToken(secret, TOKEN_PURPOSE, token);
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
        "SELECT is_open FROM congress_voting_state WHERE id = 1"
      );
      const isOpen = result.rows[0]?.is_open ?? false;
      res.json({ isOpen });
    });
  } catch (err) {
    req.log.error({ err }, "voting state error");
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/voting/device — issue a server-signed voting token for this device
router.post("/voting/device", async (req, res) => {
  if (!deviceTokenLimiter.tryHit(clientIp(req))) {
    res.status(429).json({ error: "Too many requests from this network. Please try again in a few minutes." });
    return;
  }
  try {
    const secret = await getVoteTokenSecret();
    const { token } = issueSignedToken(secret, TOKEN_PURPOSE);
    res.json({ votingToken: token });
  } catch (err) {
    req.log.error({ err }, "voting device token error");
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/voting/status — has this device's token already voted? (token in x-voting-token header)
router.get("/voting/status", async (req, res) => {
  try {
    const key = await voterKeyFromToken(req.headers["x-voting-token"]);
    if (!key) {
      res.status(401).json({ error: "Invalid voting token" });
      return;
    }
    await withTables(async () => {
      const result = await pool.query("SELECT 1 FROM congress_votes WHERE device_id = $1", [key]);
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
      const result = await pool.query("SELECT 1 FROM congress_votes WHERE device_id = $1", [deviceId]);
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
      res.status(426).json({ error: "Please update the UOA Congress app to the latest version to vote." });
    } else {
      res.status(400).json({ error: "votingToken is required" });
    }
    return;
  }

  if (!submitLimiter.tryHit(clientIp(req))) {
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
    const voterKey = await voterKeyFromToken(votingToken);
    if (!voterKey) {
      res.status(401).json({ error: "Invalid voting token. Please close and reopen the voting screen." });
      return;
    }

    await withTables(async () => {
      const stateResult = await pool.query(
        "SELECT is_open FROM congress_voting_state WHERE id = 1"
      );
      if (!stateResult.rows[0]?.is_open) {
        res.status(403).json({ error: "Voting is currently closed." });
        return;
      }

      try {
        await pool.query(
          `INSERT INTO congress_votes (device_id, slate_vote, trustee_votes)
           VALUES ($1, $2, $3)`,
          [voterKey, slateVote, trustees]
        );
        // Deliberately not logging the voter key or the choices together.
        logger.info("vote submitted");
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
        pool.query("SELECT is_open FROM congress_voting_state WHERE id = 1"),
        pool.query("SELECT COUNT(*) AS count FROM congress_votes"),
        pool.query(`
          SELECT slate_vote, COUNT(*) AS count
          FROM congress_votes
          GROUP BY slate_vote
        `),
        pool.query("SELECT trustee_votes FROM congress_votes"),
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
        "UPDATE congress_voting_state SET is_open = true WHERE id = 1"
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
        "UPDATE congress_voting_state SET is_open = false WHERE id = 1"
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
      await pool.query("DELETE FROM congress_votes");
      await pool.query(
        "UPDATE congress_voting_state SET is_open = false WHERE id = 1"
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
