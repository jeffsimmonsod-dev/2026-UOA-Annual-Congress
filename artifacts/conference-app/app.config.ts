// NOTE: conference name is hardcoded here (not imported from conference.config.ts)
// because @expo/config evaluates app.config.ts via sucrase + require-from-string.
// The resulting require() call uses Node.js standard resolution, which cannot
// resolve .ts extensions without a TypeScript hook registered first.
// The value here must match conferenceConfig.conferenceName in conference.config.ts.
import fs from "fs";
import path from "path";

// Firebase config for Android push (FCM). Provide it either as an EAS "file"
// environment variable named GOOGLE_SERVICES_JSON, or by placing
// google-services.json next to this file. It is only referenced when the file
// actually exists, so builds keep working before it has been added (Android
// push notifications will not work until it is).
const googleServicesFile = process.env.GOOGLE_SERVICES_JSON ?? "./google-services.json";
const hasGoogleServicesFile = fs.existsSync(path.resolve(googleServicesFile));

export default {
  expo: {
    name: "2026 UOA Annual Congress",
    slug: "conference-app",
    version: "2.0.2",
    orientation: "portrait",
    icon: "./assets/images/app-icon.png",
    scheme: "conference-app",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    splash: {
      image: "./assets/images/app-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff",
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "org.utaheyedoc.congress2026",
      buildNumber: "5",
      infoPlist: {
        NSCameraUsageDescription:
          "Used to scan booth QR codes in the exhibit hall",
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      package: "org.utaheyedoc.congress2026",
      versionCode: 6,
      ...(hasGoogleServicesFile ? { googleServicesFile } : {}),
      adaptiveIcon: {
        foregroundImage: "./assets/images/app-icon-adaptive.png",
        backgroundColor: "#ffffff",
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
      favicon: "./assets/images/app-icon.png",
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
          icon: "./assets/images/notification-icon.png",
          color: "#117DAB",
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
      eas: {
        projectId: "78c58011-2ce2-4113-80cc-da38f4de6e59",
      },
    },
  },
};
