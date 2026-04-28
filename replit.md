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
- 5-tab bottom navigation: Home, Schedule, Para, My Schedule, More
- Home screen with UOA logo, latest announcement card (tappable), quick action buttons, featured speakers horizontal scroll
- Schedule with sessions grouped by 4 days (Thu–Sun), color-coded by 15 track types, sorted chronologically
- Doctor and Para parallel schedules (separate tabs)
- Session detail page with speaker info and Save to My Schedule button
- 9 real speakers with actual photos, bios, and full session listings
- Venue page with address, map link, parking info, WiFi, room list
- More tab with: Sponsors, Updates, FAQ, Register Online, Admin (Send Announcement)
- My Schedule: locally saved sessions using AsyncStorage (no login required)
- Sponsors with tier groupings (Platinum, Gold, Silver, Bronze) and website links
- Updates as a timeline feed with categorized announcements
- FAQ with expandable accordion by category + contact section
- Dark/light mode support (automatic based on system preference)
- Push notifications: device registration on startup, admin screen to send announcements to all attendees (PIN: UOA2026)
- Admin screen (/admin) — PIN-protected, quick-fill templates, compose + send to all registered devices

**Push Notification Architecture:**
- Mobile: `services/pushNotifications.ts` — Expo Push Token registration + send utility
- API: `POST /api/push/register` (store token) + `POST /api/push/send` (send via Expo Push API) + `GET /api/push/stats`
- Tokens stored in-memory on API server; send calls `https://exp.host/--/api/v2/push/send`

**Tech:**
- Expo Router for file-based navigation
- AsyncStorage for local persistence (no backend needed)
- React Context for saved-session state
- `@expo/vector-icons` (Ionicons) for icons
- NativeTabs with liquid glass for iOS 26+, BlurView fallback for older iOS, Android
- Indigo/navy color theme (`#4f46e5` primary)
- `expo-notifications` + `expo-device` for push notification support
- iPad support: `supportsTablet: true` in `app.json`; `hooks/useTabletLayout.ts` constrains content to max 720px wide, uses 4-column photo grid on tablet (2 on phone)

**Web Preview Compatibility:**
- `metro.config.js` — custom resolver stubs out `react-native-worklets` on web platform via `shims/react-native-worklets-web.js` (fixes worklets init error in dev mode)
- `components/ZoomableImage.native.tsx` — gesture/pinch/zoom for iOS/Android (react-native-reanimated + gesture-handler)
- `components/ZoomableImage.web.tsx` — plain Image for web (no reanimated imports)
- `babel.config.js` — includes `react-native-worklets/plugin` for worklet transformation
- Push notifications suppressed on web via `!isWeb` guards in `pushNotifications.ts` and `_layout.tsx`

**File structure:**
```
artifacts/conference-app/
  app/
    _layout.tsx           # Root layout + push notification registration
    (tabs)/
      _layout.tsx         # Tab bar (Home/Schedule/Speakers/Venue/More)
      index.tsx           # Home (latest announcement + featured speakers)
      schedule.tsx        # Doctor schedule by day
      para.tsx            # Para schedule by day
      my-schedule.tsx     # Saved sessions tab
      more.tsx            # More menu (includes Admin)
    session/[id].tsx      # Session detail
    speaker/[id].tsx      # Speaker detail
    sponsors.tsx          # Sponsors by tier
    updates.tsx           # Announcement feed
    faq.tsx               # FAQ accordion
    admin.tsx             # PIN-protected admin → send push notifications + photo moderation
  components/
    SessionCard.tsx
    SpeakerCard.tsx
    QuickActionButton.tsx
    ErrorBoundary.tsx
    ZoomableImage.native.tsx  # Pinch/pan/double-tap zoom (native only)
    ZoomableImage.web.tsx     # Plain image (web only)
  context/
    ScheduleContext.tsx   # Saved sessions via AsyncStorage
  services/
    data.ts               # Real UOA 2026 conference data (27 sessions, 9 speakers)
    speakerImages.ts      # Speaker photo mapping (s1–s9)
    pushNotifications.ts  # Push notification utilities
  shims/
    react-native-worklets-web.js  # No-op web stub for worklets package
  assets/speakers/        # Real speaker photos (s1.jpg–s9.jpg)
  types/
    index.ts
  constants/
    colors.ts             # Design tokens (indigo theme, dark/light mode)
```

**Real data:** All content uses real 2026 UOA Annual Congress data — 9 real speakers, 27 real sessions (Dr. and Para tracks), real sponsors, venue info.

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
