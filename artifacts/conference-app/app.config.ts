// Builds the Expo config for ONE event, chosen with the EVENT environment
// variable (folder name under ./events). Defaults to the UOA 2026 demo event so
// existing builds, the Replit dev server and CI behave exactly as before.
//
//   EVENT=sample-event npx expo start          # local dev for another event
//   eas build --profile sample-event           # eas.json profile sets EVENT
//
// NOTE: @expo/config evaluates this file with sucrase + require-from-string, so
// it cannot import other .ts files. Store identity therefore lives in plain
// JSON (events/<slug>/event.json); app content lives in events/<slug>/index.ts.
import fs from "fs";
import path from "path";

const DEFAULT_EVENT = "uoa-2026";
const eventSlug = (process.env.EVENT ?? "").trim() || DEFAULT_EVENT;
const eventDir = path.resolve(__dirname, "events", eventSlug);
const eventJsonPath = path.join(eventDir, "event.json");
if (!fs.existsSync(eventJsonPath)) {
  throw new Error(
    `EVENT="${eventSlug}" not found: expected ${eventJsonPath}. ` +
      `Create it from events/sample-event (see docs/NEW_EVENT.md).`
  );
}
const event = JSON.parse(fs.readFileSync(eventJsonPath, "utf8"));
const asset = (file: string) => `./events/${eventSlug}/assets/${file}`;

// Firebase config for Android push (FCM). Provide it either as an EAS "file"
// environment variable named GOOGLE_SERVICES_JSON (recommended, set per EAS
// project), or by placing google-services.json in events/<slug>/ (or, for the
// original UOA setup, next to this file). Never commit it. It is only
// referenced when the file actually exists, so builds keep working before it
// has been added (Android push notifications will not work until it is).
const googleServicesCandidates = [
  process.env.GOOGLE_SERVICES_JSON,
  `./events/${eventSlug}/google-services.json`,
  "./google-services.json",
].filter((p): p is string => !!p);
const googleServicesFile = googleServicesCandidates.find((p) => fs.existsSync(path.resolve(p)));

export default {
  expo: {
    name: event.appName,
    slug: event.expoSlug,
    ...(event.owner ? { owner: event.owner } : {}),
    version: event.version,
    orientation: "portrait",
    icon: asset(event.images.icon),
    scheme: event.scheme,
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    splash: {
      image: asset(event.images.splash),
      resizeMode: "contain",
      backgroundColor: event.colors.splashBackground,
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: event.ios.bundleIdentifier,
      ...(event.ios.buildNumber ? { buildNumber: event.ios.buildNumber } : {}),
      infoPlist: {
        NSCameraUsageDescription: event.ios.cameraUsageDescription,
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      package: event.android.package,
      ...(event.android.versionCode ? { versionCode: event.android.versionCode } : {}),
      ...(googleServicesFile ? { googleServicesFile } : {}),
      adaptiveIcon: {
        foregroundImage: asset(event.images.adaptiveIcon),
        backgroundColor: event.colors.adaptiveIconBackground,
      },
      permissions: [
        "NOTIFICATIONS",
        "RECEIVE_BOOT_COMPLETED",
        "VIBRATE",
        "android.permission.CAMERA",
        "android.permission.RECORD_AUDIO",
      ],
    },
    web: {
      favicon: asset(event.images.favicon),
    },
    plugins: [
      [
        "expo-router",
        {
          origin: "https://replit.com/",
        },
      ],
      "expo-font",
      "expo-web-browser",
      "expo-camera",
      [
        "expo-notifications",
        {
          // Android status-bar icon: white silhouette on transparent background.
          icon: asset(event.images.notificationIcon),
          color: event.colors.notification,
          defaultChannel: "default",
        },
      ],
    ],
    updates: {
      enabled: false,
    },
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    extra: {
      event: eventSlug,
      // Leave easProjectId empty until `eas init` has created the EAS project.
      ...(event.easProjectId ? { eas: { projectId: event.easProjectId } } : {}),
    },
  },
};
