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

**Template / events:** the app is a white-label template. Branding, store identity and bundled content for each event live in `events/<slug>/` (`event.json` + `index.ts` + `content.ts` + `assets/`). Pick one with `EVENT=<slug>` (default `uoa-2026`); `metro.config.js` resolves `import event from "@event"` to that folder. `events/sample-event` is the blank starter. Launch checklist: `docs/NEW_EVENT.md`.

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
- Push notifications: device registration on startup, admin screen to send announcements to all attendees (PIN comes from the `ADMIN_PIN` secret — never write it in this file)
- Admin screen (/admin) — PIN-protected, quick-fill templates, compose + send to all registered devices
- Business Meeting Voting screen (/voting) — two-section ballot: Officer Slate (approve/disapprove/abstain) + Board Trustee (candidates and max picks set per conference on the server; UOA: 4 candidates, pick up to 3), one vote per server-signed device token, gated by voting open/closed state

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

**Business Meeting Voting Architecture:**
- Mobile: `app/voting.tsx` — two-section ballot UI, deviceId-based one-vote limit, voting open/closed awareness
- API: `POST /api/voting/submit` (cast ballot), `GET /api/voting/state` (open/closed + configured), `GET /api/voting/config` (this conference's candidates + max picks; 404 `voting_not_configured` if none), `PUT|DELETE /api/voting/config` (admin), `GET /api/voting/status` (has voted?), `GET /api/voting/results` (admin only), `POST /api/voting/open|close|reset` (admin controls)
- DB: `congress_votes` (conference_id + device_id unique, slate_vote, trustee_votes TEXT[]), `congress_voting_state` (is_open per conference), `congress_voting_config` (conference_id PK, trustee_candidates TEXT[], max_trustee_selections). Created on the first voting request; conference 1 is seeded once with the UOA 2026 ballot.
- Admin panel: "Voting" tab with open/close/reset controls, a Ballot editor, and live bar charts for both Officer Slate and Trustee results
- Tests: `pnpm --filter @workspace/api-server test:voting` (needs `DATABASE_URL` of a throwaway database)
- DeviceId: `services/deviceId.ts` — persisted via AsyncStorage (native) / localStorage (web), cached in memory

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
    data.ts               # Re-exports the selected event's bundled content
    speakerImages.ts      # Speaker photo mapping (from the selected event)
    pushNotifications.ts  # Push notification utilities
  shims/
    react-native-worklets-web.js  # No-op web stub for worklets package
  events/
    types.ts              # EventDefinition types
    uoa-2026/             # UOA 2026: event.json, index.ts, content.ts, assets/ (icons, maps, speaker photos)
    sample-event/         # Blank starter event
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

**Security configuration (API server secrets / env vars):**
- `ADMIN_PIN` (required for admin features) — at least 10 characters, not a repeated character or simple sequence. In production the server refuses to start if it is missing; if it is too weak, the server starts but every admin route returns 503. Admin PIN checks lock an IP out for 15 minutes after 5 wrong attempts.
- `VOTE_TOKEN_SECRET` (recommended, 32+ random characters) — signs voting device tokens. If unset, a random secret is generated once and stored in the `congress_server_secrets` table. Changing it invalidates existing voting tokens (apps fetch a new one automatically).
- `CORS_ALLOWED_ORIGINS` (optional, comma-separated) — extra browser origins allowed to call the API. `REPLIT_DOMAINS`, `REPLIT_DEV_DOMAIN`, `REPLIT_EXPO_DEV_DOMAIN` and `EXPO_PUBLIC_DOMAIN` are allowed automatically; native apps (no Origin header) are always allowed.
- `BOOTH_REQUIRE_ROTATING_CODE` (optional, default `false`) — when `true`, printed booth QR codes stop working and check-ins must use the live 30-second codes from `POST /api/booths/admin/:id/scan-code` (QR payload `uoa2026:boothcode:<boothId>:<code>`).
- Tunable limits (optional): `ATTENDEE_REGISTRATIONS_PER_IP_PER_HOUR` (200), `BOOTH_CHECKINS_PER_ATTENDEE_PER_10_MIN` (15), `VOTE_DEVICE_TOKENS_PER_IP_PER_HOUR` (200), `VOTE_SUBMISSIONS_PER_IP_PER_HOUR` (200).
- `PUSH_CRON_SECRET` (recommended, 24+ random characters) — protects `POST /api/push/run-scheduled`. A scheduled job should call it every minute with header `x-cron-secret: <secret>`; it sends due scheduled announcements (a database lock prevents double sends) and checks delivery receipts. The admin PIN in `x-admin-pin` is also accepted.
- `PUSH_SCHEDULER_IN_PROCESS` (optional, default `false`) — when `true`, the API server also runs scheduled announcements on an in-process 60-second timer. Only use this on an always-on single instance (it does not run while an autoscale deployment is asleep).
- `EXPO_ACCESS_TOKEN` (optional) — only needed if "Enhanced push security" is turned on in the Expo project.
- The admin dashboard is served on the same domain (`/admin-dashboard/`), so it is covered by the CORS rules above.
- Unit tests: `pnpm --filter @workspace/api-server run test:unit`. DB-backed suites (`test:community`, `test:push`, `test:voting`) need `DATABASE_URL`.

**Push notifications:** devices register with `POST /api/push/register` (one row per conference + token). Sends use `expo-server-sdk` with high priority and Android channel `default`; tickets are stored in `congress_push_tickets` and delivery receipts are checked about 15 minutes later (tokens reported as `DeviceNotRegistered` are removed). Android push needs `google-services.json` (see `GOOGLE_SERVICES_JSON` in `app.config.ts`) plus an FCM V1 key in Expo credentials; iOS needs an APNs key in Expo credentials.
