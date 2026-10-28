# Launching a new event app

The conference app (`artifacts/conference-app`) is a template. Each event gets
its **own store app** (its own name, icon, bundle ID and EAS project), built
from one folder in `artifacts/conference-app/events/<slug>/`. One shared API
server (`artifacts/api-server`) serves every event, keyed by a numeric
`conferenceId`.

| Event folder | What it is |
| --- | --- |
| `events/uoa-2026` | 2026 UOA Annual Congress — the live store app and full demo (exhibit hall, voting, para track, floor plans). |
| `events/sample-event` | Blank starter with a few placeholder speakers/sessions. Copy this one. |

The event is chosen at build time with the `EVENT` environment variable
(default `uoa-2026`). Only the selected event's content and images are bundled
into the app.

```bash
cd artifacts/conference-app
EVENT=sample-event pnpm exec expo start          # run locally
EVENT=sample-event pnpm exec expo config --json  # check name / bundle ID / icons
```

---

## Checklist

Work through these in order. Items marked **(Jarf)** need an account owner.

### 1. Event folder

- [ ] Pick a slug, e.g. `acme-2027` (lowercase, dashes).
- [ ] `cp -r events/sample-event events/acme-2027`
- [ ] **`event.json`** — store identity (read by `app.config.ts`):
  - `appName` (home-screen / store name), `version`
  - `expoSlug` — unique per EAS project, e.g. `acme-2027`
  - `scheme` — deep-link scheme, e.g. `acme2027`
  - `ios.bundleIdentifier` and `android.package` — **permanent once published**, e.g. `org.acme.congress2027`
  - `serverDomain` — API host (no `https://`); normally `expo-conference-hub.replit.app`
  - `images.*` and `colors.*`
  - leave `easProjectId` empty until step 3
- [ ] **`index.ts`** — `config` (conferenceId, names, dates, location, colors,
  `homeTitle`, `organizationShortName`, `eventNoun`, `brandIcon`, social links)
  and `content` (schedule days, track colors, floor plans, exhibit hall,
  voting).
  - No exhibit hall? `exhibitHall: null`. No voting? `voting: null`. No
    second (para) track? `paraDays: []`. No floor plans? `floorPlans: []`.
    The matching tiles/tabs disappear.
- [ ] **`content.ts`** — speakers, sessions, sponsors, venue, updates, FAQ.
  This is the offline/bundled copy; the app replaces speakers, sessions and
  sponsors with the server's copy whenever it can reach the server.
- [ ] **`assets/`** — app icon 1024×1024 PNG (no transparency for iOS),
  Android adaptive foreground 1024×1024 with safe padding, a white-on-
  transparent notification icon (96×96+), logo/splash, speaker photos.
- [ ] `EVENT=acme-2027 pnpm exec tsc --noEmit` and
  `EVENT=acme-2027 pnpm exec expo export --platform android --output-dir /tmp/acme`
  both succeed.

### 2. EAS profiles

- [ ] In `artifacts/conference-app/eas.json` add a build and submit profile
  named after the slug (copy `sample-event`), with
  `"env": { "EVENT": "acme-2027", "EXPO_PUBLIC_DOMAIN": "<server host>" }`.
- [ ] The `production` profile stays **UOA 2026**. Pushes to `main` that touch
  `artifacts/conference-app/**` auto-build `production` (UOA, Android) via
  `.github/workflows/eas-build.yml`. Build other events locally:
  `eas build --profile acme-2027 --platform all`. (Optional: add a `profile`
  input to that workflow so other events can be built from the Actions tab.)

### 3. EAS project **(Jarf)**

- [ ] `cd artifacts/conference-app && EVENT=acme-2027 eas init` — creates a
  new EAS project under the `jeffsimmonsod` account.
- [ ] Paste the printed project ID into `event.json` → `easProjectId`
  (`app.config.ts` is dynamic, so `eas init` can't write it there itself).
- [ ] Push notifications need this ID — each event's push tokens belong to
  its own project. If the server uses `EXPO_ACCESS_TOKEN`, it must be a token
  that can send for every project on the account.

### 4. Firebase (Android push) **(Jarf)**

- [ ] In the Firebase console add an Android app with the new package name
  and download `google-services.json`.
- [ ] Upload it to EAS as a **file** environment variable named
  `GOOGLE_SERVICES_JSON` on the new project (environment: production).
  Never commit it — it is git-ignored.
- [ ] Upload the FCM V1 service-account key to the project:
  `eas credentials` → Android → Push Notifications (FCM V1).

### 5. Apple (iOS push + signing) **(Jarf)**

- [ ] Register the bundle ID in App Store Connect / Apple Developer, or let
  `eas build` / `eas credentials` create it with the Push Notifications
  capability.
- [ ] Let EAS create (or reuse) the APNs key for the bundle ID.

### 6. Store listings **(Jarf)**

- [ ] App Store Connect: new app with the bundle ID, name, subtitle,
  description, screenshots, privacy details (camera use for QR/photos,
  optional email), support URL, age rating.
- [ ] Google Play Console: new app with the package name; upload the first
  AAB by hand (Play requires the first upload manually), then
  `eas submit --profile acme-2027` can push to the internal track.
- [ ] Data-safety form (Play) and privacy nutrition label (Apple).

### 7. Server conference row

- [ ] In the admin dashboard, create the conference (or
  `POST /api/conferences` with the admin PIN, or clone an existing one via
  `POST /api/conferences/:id/clone`). Note the new numeric **id**.
- [ ] Put that id in `events/acme-2027/index.ts` → `config.conferenceId`.
  The sample event uses `0` (no row), so it just shows its bundled content.
- [ ] Set branding and feature flags on the row (`feature_voting`,
  `feature_photos`, `feature_exhibit_hall`) to match the app.
- [ ] Load speakers / sessions / sponsors (bulk endpoints or dashboard).
- [ ] Mark it **published** when ready — unpublished conferences are only
  visible to admins, and the app falls back to its bundled content.

### 8. Server settings **(Jarf — Replit secrets, never in git)**

- [ ] `ADMIN_PIN` — already set (≥10 characters). Today one PIN covers every
  conference; anyone with it can manage all events.
- [ ] `PUSH_CRON_SECRET` (≥24 characters) and a job that runs **every minute**:
  `POST https://<server host>/api/push/run-scheduled` with header
  `x-cron-secret: <PUSH_CRON_SECRET>`. One job covers all conferences, so
  this only needs setting up once (or set `PUSH_SCHEDULER_IN_PROCESS=true`
  on an always-on deployment instead).
- [ ] If the event uses booth QR codes, generate booths for the new
  conference in the dashboard and print the codes.

### 9. Ship

- [ ] Internal build: `eas build --profile acme-2027 --platform all`
- [ ] Test on devices: schedule, speakers, push (send a test announcement),
  photos, exhibit hall/voting if enabled.
- [ ] `eas submit --profile acme-2027`, then promote in each store.

---

## Known limits (follow-ups)

- **Voting candidates on the server are global.** `api-server/src/routes/voting.ts`
  hard-codes the 2026 UOA trustee list and a max of 3. A second event with
  voting needs that moved into a per-conference table first.
- **Admin access is one shared PIN.** Per-conference admin logins are a
  planned follow-up.
- The **Photos/Community tab** is always shown; it isn't gated by the event
  config yet.
- The **map calibration pages** (`/api/admin/venue-calibrate` and friends in
  `api-server/src/routes/map-calibrate.ts`) only know the UOA floor plans.
- The server still seeds UOA content from `api-server/src/data/uoa2026.ts`
  (conference id 1).
- Some internal storage keys still start with `uoa_`. They're invisible to
  users and kept so UOA attendees don't lose saved data.
