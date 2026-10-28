# Events

Each folder here is one branded store app. Build/run with `EVENT=<folder>`
(default `uoa-2026`).

- `event.json` – store identity: app name, bundle ID / package, EAS project, icons, splash colors.
- `index.ts` – exports the `EventDefinition` (see `types.ts`): theme/config + content.
- `content.ts` – speakers, sessions, sponsors, venue, updates, FAQ.
- `assets/` – icons, logo, speaker photos (only the selected event is bundled).

App code imports the selected event with `import event from "@event"`
(resolved in `metro.config.js`). To launch a new event, follow
[`docs/NEW_EVENT.md`](../../../docs/NEW_EVENT.md).
