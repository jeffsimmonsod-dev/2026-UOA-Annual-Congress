# Community prize-scoring regressions

Run from the workspace root:

```sh
pnpm test:community
```

The suite requires `DATABASE_URL` for a development/test PostgreSQL database
whose role can create and drop schemas. Missing configuration fails the tests;
there is no skipped-test or in-memory fallback.

The real community and photo routers run on a temporary local Express server.
Queries use a dedicated pool whose search path contains only a randomly named
test schema, not `public`. Setup creates fixture tables inside that schema;
teardown drops that schema and removes temporary bundles. No application
records are modified. Do not configure this command with a production database.

Coverage includes:

- Independent action values, shared reply/comment caps, UTC daily resets,
  self-like exclusion, and same-liker daily deduplication.
- Inclusive cutoff boundaries and exclusion of later activity and likes.
- Reports that leave public visibility and scores unchanged.
- Hide/restore scoring, repeated moderation, and parent/child effects.
- Conference isolation for content, reports, deletions, settings, and scores.
- Owner-only deletions and mobile `canDelete` response flags.
- Public leaderboard privacy and admin response compatibility.

Object storage and Google Drive are stubbed: file transfers and rendered mobile
or dashboard interactions are not exercised. The conference middleware is
replaced with a test header; these checks verify route-level isolation, not
conference resolution. The fixture DDL represents the relevant database subset,
so schema changes affecting these routes must also update the harness.