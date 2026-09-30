---
name: Partial Drizzle schema and merges
description: Why automatic schema push after merging is unsafe for this project
---

Do not restore automatic Drizzle push on merge until the schema fully represents the existing database or a safe, reviewed migration strategy replaces it.

**Why:** The API also owns database structures outside Drizzle. A push against the partial schema prompted to drop populated tables and columns and stalled a merge; forcing the prompt would delete data.

**How to apply:** When adding data structures, explicitly reconcile the intended development schema change with existing tables before applying it. Keep automatic merge setup non-destructive; never use a force flag as a shortcut.