# Threat Model

## Project Overview

This repository is a pnpm monorepo for a conference application. The production system consists of an Expo mobile client in `artifacts/conference-app` and an Express API server in `artifacts/api-server`, with PostgreSQL for persistence and Google Cloud Storage / Google Drive integrations for uploaded photos. The app has no attendee account system; most attendee actions are tied to a client-generated `deviceId`, while administrative actions are gated by an admin PIN.

Production scope for security scanning is the Expo app, the Express API, and shared libraries they depend on. `artifacts/mockup-sandbox`, local build scripts, and other development-only tooling are out of scope unless a production code path reaches them.

## Assets

- **Administrative capabilities** — sending push notifications, scheduling announcements, creating and deleting booths, printing booth QR codes, and viewing sponsor analytics. Abuse would let an attacker impersonate staff, spam all devices, or tamper with conference operations.
- **Attendee data** — names, email addresses, booth visit history, uploaded photos, and push tokens. This data includes personal information and sponsor-reporting data that should not be exposed broadly.
- **Booth integrity data** — booth secret tokens embedded in QR codes, check-in records, raffle progress, and analytics. Tampering would undermine sponsor reporting and raffle fairness.
- **Uploaded media and object storage paths** — user-submitted photos and any other files stored in the private object namespace. These files should only be retrievable according to the intended application policy.
- **Application secrets and integrations** — `DATABASE_URL`, `ADMIN_PIN`, object-storage credentials via sidecar, and Google Drive connector access. Exposure would give broad control over backend data or external services.

## Trust Boundaries

- **Mobile client to API server** — every request from the Expo app is untrusted. The server must authenticate and authorize sensitive operations instead of trusting client-supplied identifiers.
- **Public attendee actions to admin actions** — photo uploads, likes, booth scans, and push token registration are user-facing; booth management, analytics, QR code generation, and announcement sending are privileged operations and must be protected server-side.
- **API server to PostgreSQL** — the server can read and modify all conference data. Input handling and authorization mistakes at the API layer can become full data exposure or tampering.
- **API server to object storage / Google Drive** — uploaded content crosses into external storage systems. File type, path, and visibility decisions made by the API determine whether content is safely contained.
- **Production code to dev-only artifacts** — `artifacts/mockup-sandbox`, build scripts, and local tooling are not deployed. They should normally be ignored during production scans unless a runtime route or import makes them reachable.

## Scan Anchors

- **Production entry points:** `artifacts/api-server/src/index.ts`, `artifacts/api-server/src/app.ts`, `artifacts/conference-app/app/_layout.tsx`
- **Highest-risk server routes:** `artifacts/api-server/src/routes/push.ts`, `artifacts/api-server/src/routes/booths.ts`, `artifacts/api-server/src/routes/photos.ts`, `artifacts/api-server/src/routes/qr-codes.ts`
- **Client surfaces that influence trust:** `artifacts/conference-app/app/admin.tsx`, `artifacts/conference-app/app/exhibit-hall.tsx`, `artifacts/conference-app/app/(tabs)/photos.tsx`, `artifacts/conference-app/services/pushNotifications.ts`, `artifacts/conference-app/context/ProfileContext.tsx`
- **Storage / integration helpers:** `artifacts/api-server/src/lib/objectStorage.ts`, `artifacts/api-server/src/lib/googleDrive.ts`
- **Usually dev-only / ignore unless proven reachable:** `artifacts/mockup-sandbox/**`, `artifacts/conference-app/scripts/**`, repo-level build tooling

## Threat Categories

### Spoofing

The application currently has no attendee authentication and relies on a client-generated `deviceId` for ownership and identity-like decisions. The system must not treat a caller-supplied `deviceId` as proof of user identity for destructive or privileged operations. Administrative actions must require a server-managed secret or identity mechanism that is never embedded in shipped client code.

### Tampering

Conference data can be modified through photo uploads, photo deletion and likes, booth check-ins, booth creation and deletion, and scheduled announcements. The API must validate that the caller is authorized for each mutation, and must not let users forge ownership, raffle progress, sponsor analytics, or announcements by supplying arbitrary identifiers or reused secrets.

### Information Disclosure

The backend stores attendee emails, booth visit histories, push tokens, uploaded photos, and QR-code secrets. Sponsor analytics and QR-code material are privileged outputs and must remain admin-only. Error responses and logs must avoid leaking secrets, and object storage routes must only expose files that are intended to be public.

### Denial of Service

Public endpoints accept uploads, push-token registration, booth check-ins, and photo-like toggles. The service must bound upload size and request cost, and sensitive admin endpoints must not be abusable for large-scale spam or resource exhaustion by unauthenticated callers.

### Elevation of Privilege

The main privilege boundary is between attendees and staff. The system must enforce admin authorization server-side, keep administrative secrets out of client bundles and URLs, and ensure that routes exposing analytics, booth secrets, or messaging capabilities cannot be reached by ordinary users. Any future private object-storage use must be gated by explicit access checks, not just obscured paths.
