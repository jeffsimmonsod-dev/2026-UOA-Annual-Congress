---
name: SERIAL sequence after manual ID seed
description: When seeding a table with an explicit id (e.g. INSERT ... VALUES (1, ...) ON CONFLICT DO NOTHING), the SERIAL sequence stays at 0 and the next auto-generated INSERT will try id=1 again and conflict.
---

## Rule
After any INSERT that specifies an explicit id into a SERIAL column, call `setval` to advance the sequence past the highest id:

```sql
SELECT setval(pg_get_serial_sequence('table_name', 'id'), GREATEST(MAX(id), 1))
FROM table_name;
```

**Why:** PostgreSQL's SERIAL sequence is only advanced by `nextval()`. A manual INSERT with an explicit value skips `nextval()`, leaving the sequence at its prior position. The next unqualified INSERT then calls `nextval()`, gets the same value that was just manually inserted, and hits a PK conflict.

**How to apply:** Any `ensureConferences`-style table setup that seeds a row with a fixed id must call `setval` after the seed INSERT. Same applies to `congress_voting_state` and any future tables with a seeded row and SERIAL PK.
