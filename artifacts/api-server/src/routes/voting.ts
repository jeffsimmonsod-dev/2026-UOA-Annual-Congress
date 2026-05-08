import { Router } from "express";
import { pool } from "../lib/db";
import { logger } from "../lib/logger";

const router = Router();

const TRUSTEE_CANDIDATES = [
  "Dr. Steven Blake",
  "Dr. Aaron King",
  "Dr. Jonathon King",
  "Dr. Taylor Linton",
];

const SLATE_OPTIONS = ["approve", "disapprove", "abstain"] as const;

function getAdminPin(): string {
  const pin = process.env.ADMIN_PIN;
  if (!pin) throw new Error("ADMIN_PIN environment variable is not set");
  return pin;
}

function isAdmin(req: { headers: Record<string, string | string[] | undefined> }): boolean {
  try {
    return req.headers["x-admin-pin"] === getAdminPin();
  } catch {
    return false;
  }
}

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

router.get("/voting/status/:deviceId", async (req, res) => {
  const { deviceId } = req.params;
  if (!deviceId) {
    res.status(400).json({ error: "deviceId required" });
    return;
  }
  try {
    await withTables(async () => {
      const result = await pool.query(
        "SELECT slate_vote, trustee_votes, submitted_at FROM congress_votes WHERE device_id = $1",
        [deviceId]
      );
      if (result.rows.length === 0) {
        res.json({ hasVoted: false });
      } else {
        res.json({
          hasVoted: true,
          slateVote: result.rows[0].slate_vote,
          trusteeVotes: result.rows[0].trustee_votes,
          submittedAt: result.rows[0].submitted_at,
        });
      }
    });
  } catch (err) {
    req.log.error({ err }, "voting status error");
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/voting/submit", async (req, res) => {
  const { deviceId, slateVote, trusteeVotes } = req.body as {
    deviceId?: string;
    slateVote?: string;
    trusteeVotes?: string[];
  };

  if (!deviceId?.trim()) {
    res.status(400).json({ error: "deviceId is required" });
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
  const invalidTrustee = trustees.find((t) => !TRUSTEE_CANDIDATES.includes(t));
  if (invalidTrustee) {
    res.status(400).json({ error: `Invalid trustee candidate: ${invalidTrustee}` });
    return;
  }

  try {
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
          [deviceId.trim(), slateVote, trustees]
        );
        logger.info({ deviceId: deviceId.trim(), slateVote, trustees }, "vote submitted");
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
  if (!isAdmin(req as any)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
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
  if (!isAdmin(req as any)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
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
  if (!isAdmin(req as any)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
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
  if (!isAdmin(req as any)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
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
