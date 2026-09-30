---
name: Phone preview safe areas
description: Why the Expo phone web preview needs a top safe-area fallback
---

Treat the phone preview's simulated Dynamic Island as an overlay that the browser cannot measure, not as a native safe-area inset. Centralize the narrow-web fallback so screens and headers use consistent spacing; preserve measured insets on real native devices.

**Why:** The mobile preview can report a zero top inset while its phone frame covers top-of-screen text. Fixing isolated screens leaves other routes obstructed.

**How to apply:** When adding full-screen content or changing headers, consume the shared safe-area context rather than introducing separate web-only top padding.