---
name: Community operator attribution
description: Trust boundary and compatibility for named community decision sessions
---

Named operator sessions use names supplied at shared-PIN sign-in; they are attributable sessions, not independently verified organizer accounts. Preserve this distinction in UI wording and future audit features.

**Why:** The requested scope permits attributable operator sessions without onboarding separate accounts. A name supplied alongside a decision must never substitute for server-authenticated session attribution.

**How to apply:** Read actor names from a validated session when recording new decisions. Keep historical shared-PIN records honestly labeled, and do not backfill guessed identities. Legacy mobile PIN verification must remain usable for its existing non-community operations, but cannot authorize new community decisions.