import { test } from "node:test";
import assert from "node:assert/strict";
import { UOA_2026_VOTING_CONFIG, checkTrusteeVotes, parseVotingConfig, sameCandidates } from "../lib/votingConfig";

test("UOA 2026 seed matches the ballot that was hard-coded before", () => {
  assert.deepEqual([...UOA_2026_VOTING_CONFIG.trusteeCandidates], [
    "Dr. Steven Blake",
    "Dr. Aaron King",
    "Dr. Jonathon King",
    "Dr. Taylor Linton",
  ]);
  assert.equal(UOA_2026_VOTING_CONFIG.maxTrusteeSelections, 3);
});

test("ballot config is validated and trimmed", () => {
  const ok = parseVotingConfig({ trusteeCandidates: [" Ann ", "Bob"], maxTrusteeSelections: 1 });
  assert.deepEqual(ok, { ok: true, config: { trusteeCandidates: ["Ann", "Bob"], maxTrusteeSelections: 1 } });
  assert.equal(parseVotingConfig(null).ok, false);
  assert.equal(parseVotingConfig({ trusteeCandidates: [], maxTrusteeSelections: 1 }).ok, false);
  assert.equal(parseVotingConfig({ trusteeCandidates: ["A", " A"], maxTrusteeSelections: 1 }).ok, false);
  assert.equal(parseVotingConfig({ trusteeCandidates: ["A", ""], maxTrusteeSelections: 1 }).ok, false);
  assert.equal(parseVotingConfig({ trusteeCandidates: ["A", 3], maxTrusteeSelections: 1 }).ok, false);
  assert.equal(parseVotingConfig({ trusteeCandidates: ["A", "B"], maxTrusteeSelections: 3 }).ok, false);
  assert.equal(parseVotingConfig({ trusteeCandidates: ["A", "B"], maxTrusteeSelections: 0 }).ok, false);
  assert.equal(parseVotingConfig({ trusteeCandidates: ["A", "B"], maxTrusteeSelections: 1.5 }).ok, false);
  assert.equal(parseVotingConfig({ trusteeCandidates: ["A", "B"], maxTrusteeSelections: "1" }).ok, false);
  assert.equal(parseVotingConfig({ trusteeCandidates: ["x".repeat(121)], maxTrusteeSelections: 1 }).ok, false);
  assert.equal(parseVotingConfig({ trusteeCandidates: Array.from({ length: 51 }, (_, i) => `C${i}`), maxTrusteeSelections: 1 }).ok, false);
});

test("trustee picks are checked against the conference's own ballot", () => {
  const uoa = UOA_2026_VOTING_CONFIG;
  assert.deepEqual(checkTrusteeVotes(uoa, undefined), { ok: true, votes: [] });
  assert.equal(checkTrusteeVotes(uoa, ["Dr. Steven Blake", "Dr. Aaron King", "Dr. Taylor Linton"]).ok, true);
  assert.deepEqual(checkTrusteeVotes(uoa, ["Dr. Steven Blake", "Dr. Aaron King", "Dr. Jonathon King", "Dr. Taylor Linton"]), {
    ok: false,
    error: "You may select at most 3 trustee candidates",
  });
  assert.equal(checkTrusteeVotes(uoa, ["Dr. Steven Blake", "Dr. Steven Blake"]).ok, false);
  assert.equal(checkTrusteeVotes(uoa, ["Someone Else"]).ok, false);
  assert.equal(checkTrusteeVotes(uoa, [42]).ok, false);
  const other = { trusteeCandidates: ["Ann", "Bob"], maxTrusteeSelections: 1 };
  assert.equal(checkTrusteeVotes(other, ["Dr. Steven Blake"]).ok, false, "UOA names are not valid elsewhere");
  assert.equal(checkTrusteeVotes(other, ["Ann", "Bob"]).ok, false);
  assert.equal(checkTrusteeVotes(other, ["Bob"]).ok, true);
});

test("sameCandidates compares names and order", () => {
  assert.equal(sameCandidates(["a", "b"], ["a", "b"]), true);
  assert.equal(sameCandidates(["a", "b"], ["b", "a"]), false);
  assert.equal(sameCandidates(["a"], ["a", "b"]), false);
});
