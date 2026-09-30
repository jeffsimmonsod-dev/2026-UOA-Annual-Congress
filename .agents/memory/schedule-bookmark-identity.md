---
name: Schedule bookmark identity
description: Why missing session bookmarks remain visible instead of being silently remapped or deleted
---

Keep bookmarks whose IDs no longer exist visible and removable by the attendee, rather than automatically reassigning them to another session.

**Why:** A re-import can change external IDs, but matching on titles, room, or times is ambiguous when sessions are renamed, rescheduled, or duplicated. An incorrect remap would claim an attendee saved something they did not.

**How to apply:** If import identity rules change, preserve the attendee's saved ID until an explicit, reliable old-to-new mapping exists; missing bookmarks must not count as schedule conflicts.