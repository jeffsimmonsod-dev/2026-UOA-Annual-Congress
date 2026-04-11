# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Artifacts

### Conference App (`artifacts/conference-app`)

A cross-platform mobile conference app built with Expo (React Native + TypeScript).

**Features:**
- 5-tab bottom navigation: Home, Schedule, Speakers, Venue, More
- Home screen with conference info, welcome message, quick action buttons
- Schedule with sessions grouped by day (3 days), color-coded by track
- Session detail page with speaker info and Save to My Schedule button
- Speakers list with photos and bios, linked to sessions
- Venue page with address, map link, parking info, WiFi, room list
- More tab with: My Schedule, Sponsors, Updates, FAQ
- My Schedule: locally saved sessions using AsyncStorage (no login required)
- Sponsors with tier groupings (Platinum, Gold, Silver, Bronze) and website links
- Updates as a timeline feed with categorized announcements
- FAQ with expandable accordion by category + contact section

**Tech:**
- Expo Router for file-based navigation
- AsyncStorage for local persistence (no backend needed)
- React Context for saved-session state
- `@expo/vector-icons` (Ionicons) for icons
- NativeTabs with liquid glass for iOS 26+, BlurView fallback for older iOS, Android
- Indigo/navy color theme (`#4f46e5` primary)

**File structure:**
```
artifacts/conference-app/
  app/
    _layout.tsx           # Root layout with providers
    (tabs)/
      _layout.tsx         # Tab bar (Home/Schedule/Speakers/Venue/More)
      index.tsx           # Home
      schedule.tsx        # Schedule by day
      speakers.tsx        # Speakers list
      venue.tsx           # Venue info
      more.tsx            # More menu
    session/[id].tsx      # Session detail
    speaker/[id].tsx      # Speaker detail
    my-schedule.tsx       # Saved sessions
    sponsors.tsx          # Sponsors by tier
    updates.tsx           # Announcement feed
    faq.tsx               # FAQ accordion
  components/
    SessionCard.tsx
    SpeakerCard.tsx
    QuickActionButton.tsx
    ErrorBoundary.tsx     # Pre-installed
  context/
    ScheduleContext.tsx   # Saved sessions via AsyncStorage
  services/
    data.ts               # All placeholder data + helpers
  types/
    index.ts              # TypeScript types
  constants/
    colors.ts             # Design tokens (indigo theme, dark mode)
```

**Placeholder data:** All content (sessions, speakers, sponsors, venue, updates, FAQ) uses placeholder data. Ready for Firebase integration later.

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
