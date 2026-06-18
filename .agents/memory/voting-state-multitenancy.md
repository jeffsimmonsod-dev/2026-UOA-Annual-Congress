---
name: Voting state single-row table pitfall
description: congress_voting_state was originally a single-row table (id INTEGER DEFAULT 1 CHECK id=1). Multi-tenancy requires a sequence migration and lazy row creation instead of clone-time seeding.
---

## Rule
`congress_voting_state` was originally designed as a singleton table. Multi-tenancy retrofit:
1. Added `conference_id INTEGER` column + UNIQUE constraint.
2. Added sequence `congress_voting_state_id_seq` and changed `id` DEFAULT to `nextval('...')` via an `ensureTables()` migration in voting.ts.
3. Removed voting state INSERT from the clone endpoint — rows are created lazily by open/close/reset routes (which all upsert via `ON CONFLICT (conference_id) DO UPDATE`).
4. `GET /voting/state` handles missing rows with `?? false` — no row needed for a conference to return closed state.

**Why:** The clone endpoint runs before any voting route, so the sequence migration (which runs lazily in `withTables()`) hadn't fired yet. Inserting into the table in the clone hit `id DEFAULT 1`, conflicting with the existing seed row.

**How to apply:** For future tables with similar single-row origins being multi-tenanted, prefer lazy upsert initialization in each route handler over seeding in the clone. Never insert into tables from the clone that have un-migrated SERIAL/DEFAULT issues.
