// `pnpm test:community` runs these tests against two real routers and a
// disposable PostgreSQL schema; DATABASE_URL is mandatory.
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import {
  ADMIN_PIN,
  api,
  comment,
  DAY_ONE,
  DAY_TWO,
  discussion,
  hasRow,
  photo,
  points,
  register,
  reply,
  startHarness,
  stopHarness,
} from "./harness.mjs";

let context;
before(async () => {
  context = await startHarness();
});
after(async () => {
  await stopHarness(context);
});

function rowByName(leaders, name) {
  const result = leaders.find((item) => item.name === name);
  assert.ok(result, `Expected leaderboard row for ${name}`);
  return result;
}

async function setHidden(type, id, hidden, conferenceId = 101) {
  return api(context, "/community/admin/content", {
    conferenceId,
    admin: true,
    method: "PATCH",
    body: { type, id, hidden },
  });
}

test("action values, UTC daily caps, self-like exclusion, and same-day like de-duplication", async (t) => {
  const pool = context.integrationPool;
  const actor = "per-action";
  const externalLiker = "per-action-liker";
  await register(pool, 101, actor, "Per Action");
  await register(pool, 101, externalLiker, "External Liker");
  await photo(pool, { id: "per-action-photo", token: actor, at: `${DAY_ONE}T01:00:00Z` });

  assert.equal(await points(context, actor), 5, "one photo is worth five points");
  const selfLike = await api(context, "/photos/per-action-photo/like", {
    method: "POST",
    body: { sessionToken: actor },
  });
  assert.equal(selfLike.status, 200);
  assert.equal(await points(context, actor), 5, "an uploader receives no points for liking their own photo");
  const externalLike = await api(context, "/photos/per-action-photo/like", {
    method: "POST",
    body: { sessionToken: externalLiker },
  });
  assert.equal(externalLike.status, 200);
  assert.equal(await points(context, actor), 6, "a valid external like adds one point");

  const topic = await discussion(pool, { token: actor, title: "Action value", at: `${DAY_ONE}T01:03:00Z` });
  assert.equal(await points(context, actor), 11, "one discussion adds five points");
  await reply(pool, { discussionId: topic, token: actor, at: `${DAY_ONE}T01:04:00Z` });
  assert.equal(await points(context, actor), 14, "one reply adds three points");
  await comment(pool, { photoId: "per-action-photo", token: actor, at: `${DAY_ONE}T01:05:00Z` });
  assert.equal(await points(context, actor), 17, "one comment adds three points");

  const capped = "daily-caps";
  await register(pool, 101, capped, "Daily Caps");
  for (let index = 0; index < 3; index += 1) {
    await photo(pool, { id: `cap-photo-${index}`, token: capped, at: `${DAY_ONE}T02:0${index}:00Z` });
    await discussion(pool, { token: capped, title: `Cap discussion ${index}`, at: `${DAY_ONE}T03:0${index}:00Z` });
  }
  await photo(pool, { id: "cap-photo-day-two", token: capped, at: `${DAY_TWO}T02:00:00Z` });
  await discussion(pool, { token: capped, title: "Day two discussion", at: `${DAY_TWO}T03:00:00Z` });
  const firstDiscussion = await pool.query(
    "SELECT id FROM community_discussions WHERE conference_id = 101 AND session_token = $1 ORDER BY id LIMIT 1",
    [capped],
  );
  for (let index = 0; index < 5; index += 1) {
    await reply(pool, {
      discussionId: firstDiscussion.rows[0].id,
      token: capped,
      at: `${DAY_ONE}T04:${String(index).padStart(2, "0")}:00Z`,
    });
  }
  for (let index = 0; index < 2; index += 1) {
    await comment(pool, {
      photoId: "cap-photo-0",
      token: capped,
      at: `${DAY_ONE}T05:0${index}:00Z`,
    });
  }
  await comment(pool, { photoId: "cap-photo-day-two", token: capped, at: `${DAY_TWO}T05:00:00Z` });
  for (let index = 0; index < 11; index += 1) {
    await pool.query(
      "INSERT INTO congress_photo_likes (photo_id, device_id, created_at) VALUES ($1, $2, $3)",
      [`cap-photo-${index % 3}`, `cap-liker-${index}`, `${DAY_ONE}T06:${String(index).padStart(2, "0")}:00Z`],
    );
  }
  await pool.query(
    "INSERT INTO congress_photo_likes (photo_id, device_id, created_at) VALUES ($1, $2, $3)",
    ["cap-photo-day-two", "cap-liker-day-two", `${DAY_TWO}T06:00:00Z`],
  );
  assert.equal(
    await points(context, capped),
    59,
    "UTC day two resets photo (5), discussion (5), social (3), and like (1) caps",
  );

  const deduped = "daily-like-dedup";
  await register(pool, 101, deduped, "Like Dedup");
  for (let index = 0; index < 3; index += 1) {
    await photo(pool, {
      id: `dedup-photo-${index}`,
      token: deduped,
      at: `${index < 2 ? DAY_ONE : DAY_TWO}T07:0${index}:00Z`,
    });
  }
  await pool.query(
    `INSERT INTO congress_photo_likes (photo_id, device_id, created_at) VALUES
       ('dedup-photo-0', 'repeat-liker', $1),
       ('dedup-photo-1', 'repeat-liker', $1),
       ('dedup-photo-2', 'repeat-liker', $2)`,
    [`${DAY_ONE}T08:00:00Z`, `${DAY_TWO}T08:00:00Z`],
  );
  assert.equal(await points(context, deduped), 17, "same liker earns once per uploader/day, then again the next UTC day");

  await t.test("mobile and administrator leaderboard response envelopes remain compatible", async () => {
    const result = await api(context, `/community/leaderboard?sessionToken=${actor}`);
    assert.equal(result.status, 200);
    assert.deepEqual(Object.keys(result.data).sort(), ["cutoffAt", "leaders", "me"]);
    assert.deepEqual(result.data.me, { name: "Per Action", points: 17, rank: result.data.me.rank });
    assert.ok(Number.isInteger(result.data.me.rank));
    assert.ok(result.data.leaders.every((item) =>
      Object.keys(item).sort().join(",") === "name,points,rank"));
    assert.equal(JSON.stringify(result.data).includes(actor), false, "public leaderboard cannot expose a session token");

    const admin = await api(context, "/community/admin/leaderboard", { admin: true });
    assert.equal(admin.status, 200);
    assert.ok(admin.data.leaders.some((item) => item.sessionToken === actor && item.points === 17));
    assert.ok(admin.data.leaders.every((item) => "sessionToken" in item), "admin export retains identity tokens");
    assert.equal(ADMIN_PIN, process.env.ADMIN_PIN);
  });
});

test("cutoff is inclusive at the boundary and excludes later actions and likes", async () => {
  const token = "cutoff-boundary";
  await register(context.integrationPool, 101, token, "Cutoff Boundary");
  await photo(context.integrationPool, { id: "cutoff-before", token, at: `${DAY_ONE}T10:00:00Z` });
  await discussion(context.integrationPool, { token, title: "Exactly at cutoff", at: `${DAY_ONE}T11:00:00Z` });
  await photo(context.integrationPool, { id: "cutoff-after", token, at: `${DAY_ONE}T11:01:00Z` });
  await context.integrationPool.query(
    `INSERT INTO congress_photo_likes (photo_id, device_id, created_at) VALUES
       ('cutoff-before', 'early-liker', $1),
       ('cutoff-after', 'late-liker', $2)`,
    [`${DAY_ONE}T10:30:00Z`, `${DAY_ONE}T11:02:00Z`],
  );

  const set = await api(context, "/community/admin/settings", {
    admin: true,
    method: "PATCH",
    body: { cutoffAt: `${DAY_ONE}T11:00:00Z` },
  });
  assert.equal(set.status, 200);
  const scored = await api(context, `/community/leaderboard?sessionToken=${token}`);
  assert.equal(scored.status, 200);
  assert.equal(scored.data.me.points, 11, "pre-cutoff photo, boundary discussion, and early like score; later items do not");
  assert.equal(new Date(scored.data.cutoffAt).toISOString(), `${DAY_ONE}T11:00:00.000Z`);

  const postCutoff = await api(context, "/community/discussions", {
    method: "POST",
    body: { sessionToken: token, name: "Cutoff Boundary", title: "After freeze", body: "No score after cutoff" },
  });
  assert.equal(postCutoff.status, 201);
  assert.equal(await points(context, token), 11, "new activity after the stored cutoff cannot change frozen score");
  assert.equal((await api(context, "/community/admin/settings", {
    admin: true,
    method: "PATCH",
    body: { cutoffAt: null },
  })).status, 200);
});

test("reports remain public and report-only, with no score or visibility change", async () => {
  const target = "reported-target";
  const reporter = "reporting-user";
  await register(context.integrationPool, 101, target, "Reported Target");
  await register(context.integrationPool, 101, reporter, "Reporter");
  const targetId = await discussion(context.integrationPool, {
    token: target,
    title: "Still visible after report",
    at: `${DAY_ONE}T12:00:00Z`,
  });
  const scoreBefore = await points(context, target);
  const report = await api(context, "/community/reports", {
    method: "POST",
    body: { sessionToken: reporter, type: "discussion", id: targetId, reason: "Please review" },
  });
  assert.equal(report.status, 201);
  assert.equal(await points(context, target), scoreBefore, "reporting must not change scoring");

  const admin = await api(context, "/community/admin", { admin: true });
  assert.equal(admin.status, 200);
  assert.ok(Array.isArray(admin.data.reports));
  assert.ok(Array.isArray(admin.data.content));
  assert.ok(Array.isArray(admin.data.users));
  assert.ok(Object.hasOwn(admin.data, "cutoffAt"));
  assert.ok(admin.data.reports.some((item) =>
    item.type === "discussion" && item.targetId === String(targetId) && item.status === "pending"));
  assert.ok(admin.data.content.some((item) =>
    item.type === "discussion" && String(item.id) === String(targetId) && item.hidden === false));
  const publicList = await api(context, `/community/discussions?sessionToken=${reporter}`);
  assert.equal(publicList.status, 200);
  assert.ok(publicList.data.discussions.some((item) => item.id === targetId));
});

test("hide and restore operations reverse parent/child scores idempotently", async () => {
  const token = "moderated-author";
  await register(context.integrationPool, 101, token, "Moderated Author");
  const topic = await discussion(context.integrationPool, { token, title: "Moderated parent", at: `${DAY_ONE}T13:00:00Z` });
  const childReply = await reply(context.integrationPool, { discussionId: topic, token, at: `${DAY_ONE}T13:01:00Z` });
  assert.equal(await points(context, token), 8);

  assert.equal((await setHidden("discussion", topic, true)).status, 200);
  assert.equal(await points(context, token), 0, "hidden parent excludes itself and its visible reply from points");
  assert.equal((await setHidden("discussion", topic, true)).status, 200);
  assert.equal(await points(context, token), 0);
  assert.equal((await api(context, `/community/discussions/${topic}?sessionToken=${token}`)).status, 404);
  assert.equal((await setHidden("discussion", topic, false)).status, 200);
  assert.equal(await points(context, token), 8);
  assert.equal((await setHidden("discussion", topic, false)).status, 200);
  assert.equal(await points(context, token), 8);

  assert.equal((await setHidden("reply", childReply, true)).status, 200);
  assert.equal(await points(context, token), 5);
  assert.equal((await setHidden("reply", childReply, true)).status, 200);
  assert.equal(await points(context, token), 5);
  assert.equal((await setHidden("reply", childReply, false)).status, 200);
  assert.equal(await points(context, token), 8);

  const photoOwner = "moderated-photo-owner";
  await register(context.integrationPool, 101, photoOwner, "Moderated Photo Owner");
  await photo(context.integrationPool, { id: "moderated-photo", token: photoOwner, at: `${DAY_ONE}T14:00:00Z` });
  const moderatedCommentId = await comment(context.integrationPool, {
    photoId: "moderated-photo",
    token: photoOwner,
    at: `${DAY_ONE}T14:01:00Z`,
  });
  await context.integrationPool.query(
    "INSERT INTO congress_photo_likes (photo_id, device_id, created_at) VALUES ($1, $2, $3)",
    ["moderated-photo", "photo-external-liker", `${DAY_ONE}T14:02:00Z`],
  );
  assert.equal(await points(context, photoOwner), 9);
  assert.equal((await setHidden("photo", "moderated-photo", true)).status, 200);
  assert.equal(await points(context, photoOwner), 0, "hiding a photo removes its upload, comment, and like score");
  assert.equal((await setHidden("photo", "moderated-photo", true)).status, 200);
  assert.equal(await points(context, photoOwner), 0);
  assert.equal((await api(context, "/photos")).data.photos.some((item) => item.id === "moderated-photo"), false);
  assert.equal((await setHidden("photo", "moderated-photo", false)).status, 200);
  assert.equal(await points(context, photoOwner), 9, "restoring parent restores its comment and like points");
  assert.equal((await setHidden("comment", moderatedCommentId, true)).status, 200);
  assert.equal(await points(context, photoOwner), 6);
  assert.equal((await setHidden("comment", moderatedCommentId, true)).status, 200);
  assert.equal(await points(context, photoOwner), 6);
  assert.equal((await setHidden("comment", moderatedCommentId, false)).status, 200);
  assert.equal(await points(context, photoOwner), 9, "restoring the child comment restores its three points");
  assert.equal((await setHidden("comment", moderatedCommentId, false)).status, 200);
  assert.equal(await points(context, photoOwner), 9);

  const audit = await api(context, "/community/admin/actions", { admin: true });
  assert.equal(audit.status, 200);
  const expectedTransitions = [
    ["discussion", topic],
    ["reply", childReply],
    ["photo", "moderated-photo"],
    ["comment", moderatedCommentId],
  ];
  for (const [targetType, targetId] of expectedTransitions) {
    const transitions = audit.data.actions.filter((action) =>
      action.targetType === targetType && action.targetId === String(targetId));
    assert.equal(transitions.length, 2, `${targetType} audits only actual hide and restore transitions`);
    assert.ok(transitions.every((action) =>
      action.actorLabel === "Regression Organizer" &&
      action.reason === "Integration regression test" &&
      action.previousValue !== action.newValue));
  }
});

test("conference content, reports, deletes, cutoff settings, and scores are tenant-isolated", async () => {
  const firstOwner = "tenant-one-owner";
  const secondOwner = "tenant-two-owner";
  const reporter = "tenant-two-reporter";
  await register(context.integrationPool, 101, firstOwner, "Tenant One");
  await register(context.integrationPool, 202, secondOwner, "Tenant Two");
  await register(context.integrationPool, 202, reporter, "Tenant Two Reporter");
  const foreignDiscussionId = await discussion(context.integrationPool, {
    conferenceId: 101,
    token: firstOwner,
    title: "Tenant one content",
    at: `${DAY_ONE}T15:00:00Z`,
  });
  await photo(context.integrationPool, {
    conferenceId: 101,
    id: "tenant-one-photo",
    token: firstOwner,
    deleteToken: "tenant-one-delete",
    at: `${DAY_ONE}T15:01:00Z`,
  });
  const ownDiscussionId = await discussion(context.integrationPool, {
    conferenceId: 202,
    token: secondOwner,
    title: "Tenant two content",
    at: `${DAY_ONE}T15:00:00Z`,
  });

  assert.equal((await api(context, `/community/discussions/${foreignDiscussionId}?sessionToken=${secondOwner}`, {
    conferenceId: 202,
  })).status, 404, "a valid tenant-two session cannot read tenant-one content");
  assert.equal((await api(context, "/photos", { conferenceId: 202 })).data.photos.some((item) => item.id === "tenant-one-photo"), false);
  assert.equal((await api(context, "/community/reports", {
    conferenceId: 202,
    method: "POST",
    body: { sessionToken: reporter, type: "discussion", id: foreignDiscussionId, reason: "Cross tenant report" },
  })).status, 404);
  assert.equal((await api(context, `/community/discussion/${foreignDiscussionId}`, {
    conferenceId: 202,
    method: "DELETE",
    body: { sessionToken: secondOwner },
  })).status, 404);
  assert.equal((await api(context, "/photos/tenant-one-photo", {
    conferenceId: 202,
    method: "DELETE",
    body: { deleteToken: "tenant-one-delete" },
  })).status, 403);
  assert.equal(await hasRow(context.integrationPool, "community_discussions", foreignDiscussionId), true);

  const oneCutoff = `${DAY_ONE}T15:02:00Z`;
  assert.equal((await api(context, "/community/admin/settings", {
    conferenceId: 101,
    admin: true,
    method: "PATCH",
    body: { cutoffAt: oneCutoff },
  })).status, 200);
  const tenantOne = await api(context, `/community/leaderboard?sessionToken=${firstOwner}`, { conferenceId: 101 });
  const tenantTwo = await api(context, `/community/leaderboard?sessionToken=${secondOwner}`, { conferenceId: 202 });
  assert.equal(tenantOne.data.me.points, 10);
  assert.equal(tenantTwo.data.me.points, 5);
  assert.equal(new Date(tenantOne.data.cutoffAt).toISOString(), new Date(oneCutoff).toISOString());
  assert.equal(tenantTwo.data.cutoffAt, null, "tenant-one settings do not leak into tenant two");
  assert.equal((await api(context, `/community/discussions/${ownDiscussionId}?sessionToken=${secondOwner}`, {
    conferenceId: 202,
  })).status, 200);
});

test("owner-delete authorization preserves denied rows and removes owned content from storage and public views", async () => {
  const owner = "delete-owner";
  const other = "delete-other";
  await register(context.integrationPool, 101, owner, "Delete Owner");
  await register(context.integrationPool, 101, other, "Delete Other");

  const ownTopic = await api(context, "/community/discussions", {
    method: "POST",
    body: { sessionToken: owner, name: "Delete Owner", title: "Delete me", body: "Owned discussion" },
  });
  const topicId = ownTopic.data.discussion.id;
  const ownerDetail = await api(context, `/community/discussions/${topicId}?sessionToken=${owner}`);
  const readerDetail = await api(context, `/community/discussions/${topicId}?sessionToken=${other}`);
  assert.equal(ownerDetail.data.discussion.canDelete, true);
  assert.equal(readerDetail.data.discussion.canDelete, false);
  assert.equal(Object.hasOwn(ownerDetail.data.discussion, "sessionToken"), false);
  const deniedTopic = await api(context, `/community/discussion/${topicId}`, {
    method: "DELETE",
    body: { sessionToken: other },
  });
  assert.equal(deniedTopic.status, 403);
  assert.equal(await hasRow(context.integrationPool, "community_discussions", topicId), true);
  assert.equal((await api(context, `/community/discussions/${topicId}?sessionToken=${owner}`)).status, 200);
  assert.equal((await api(context, `/community/discussion/${topicId}`, {
    method: "DELETE",
    body: { sessionToken: owner },
  })).status, 200);
  assert.equal(await hasRow(context.integrationPool, "community_discussions", topicId), false);
  assert.equal((await api(context, `/community/discussions/${topicId}?sessionToken=${owner}`)).status, 404);

  const replyParent = await api(context, "/community/discussions", {
    method: "POST",
    body: { sessionToken: owner, name: "Delete Owner", title: "Reply parent", body: "Parent" },
  });
  const replyResponse = await api(context, `/community/discussions/${replyParent.data.discussion.id}/replies`, {
    method: "POST",
    body: { sessionToken: other, name: "Delete Other", body: "Owned reply" },
  });
  const replyId = replyResponse.data.reply.id;
  const parentPath = `/community/discussions/${replyParent.data.discussion.id}`;
  const replyOwnerView = await api(context, `${parentPath}?sessionToken=${other}`);
  const parentOwnerView = await api(context, `${parentPath}?sessionToken=${owner}`);
  assert.equal(replyOwnerView.data.discussion.replies[0].canDelete, true);
  assert.equal(parentOwnerView.data.discussion.replies[0].canDelete, false);
  assert.equal(Object.hasOwn(replyOwnerView.data.discussion.replies[0], "sessionToken"), false);
  assert.equal((await api(context, `/community/reply/${replyId}`, {
    method: "DELETE",
    body: { sessionToken: owner },
  })).status, 403);
  assert.equal(await hasRow(context.integrationPool, "community_replies", replyId), true);
  assert.equal((await api(context, `/community/discussions/${replyParent.data.discussion.id}?sessionToken=${owner}`))
    .data.discussion.replies.length, 1);
  assert.equal((await api(context, `/community/reply/${replyId}`, {
    method: "DELETE",
    body: { sessionToken: other },
  })).status, 200);
  assert.equal(await hasRow(context.integrationPool, "community_replies", replyId), false);
  assert.equal((await api(context, `/community/discussions/${replyParent.data.discussion.id}?sessionToken=${owner}`))
    .data.discussion.replies.length, 0);

  await photo(context.integrationPool, { id: "delete-comment-photo", token: owner, at: `${DAY_ONE}T16:00:00Z` });
  const commentResponse = await api(context, "/community/photos/delete-comment-photo/comments", {
    method: "POST",
    body: { sessionToken: other, name: "Delete Other", body: "Owned comment" },
  });
  const commentId = commentResponse.data.comment.id;
  const commentsPath = "/community/photos/delete-comment-photo/comments";
  const commentOwnerView = await api(context, `${commentsPath}?sessionToken=${other}`);
  const photoOwnerView = await api(context, `${commentsPath}?sessionToken=${owner}`);
  assert.equal(commentOwnerView.data.comments[0].canDelete, true);
  assert.equal(photoOwnerView.data.comments[0].canDelete, false);
  assert.equal((await api(context, `/community/comment/${commentId}`, {
    method: "DELETE",
    body: { sessionToken: owner },
  })).status, 403);
  assert.equal(await hasRow(context.integrationPool, "community_photo_comments", commentId), true);
  assert.equal((await api(context, `/community/photos/delete-comment-photo/comments?sessionToken=${owner}`))
    .data.comments.length, 1);
  assert.equal((await api(context, `/community/comment/${commentId}`, {
    method: "DELETE",
    body: { sessionToken: other },
  })).status, 200);
  assert.equal(await hasRow(context.integrationPool, "community_photo_comments", commentId), false);
  assert.equal((await api(context, `/community/photos/delete-comment-photo/comments?sessionToken=${owner}`))
    .data.comments.length, 0);

  await photo(context.integrationPool, {
    id: "owner-delete-photo",
    token: owner,
    deleteToken: "photo-owner-delete-secret",
    at: `${DAY_ONE}T17:00:00Z`,
  });
  assert.equal((await api(context, "/photos/owner-delete-photo", {
    method: "DELETE",
    body: { deleteToken: "not-owner" },
  })).status, 403);
  assert.equal(await hasRow(context.integrationPool, "congress_photos", "owner-delete-photo"), true);
  assert.ok((await api(context, "/photos")).data.photos.some((item) => item.id === "owner-delete-photo"));
  assert.equal((await api(context, "/photos/owner-delete-photo", {
    method: "DELETE",
    body: { deleteToken: "photo-owner-delete-secret" },
  })).status, 200);
  assert.equal(await hasRow(context.integrationPool, "congress_photos", "owner-delete-photo"), false);
  assert.equal((await api(context, "/photos")).data.photos.some((item) => item.id === "owner-delete-photo"), false);
});