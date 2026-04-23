// Dynamic Expo config: omits EAS projectId during local dev (no EXPO_TOKEN)
// so the dev server never needs Expo account auth for Expo Go testing.
// Production EAS builds supply EXPO_TOKEN and get the full config.

const IS_PRODUCTION = !!process.env.EXPO_TOKEN;

const PROJECT_ID = "78c58011-2ce2-4113-80cc-da38f4de6e59";

/** @type {import('expo/config').ExpoConfig} */
module.exports = {
  name: "UOA Annual Congress 2026",
  slug: "conference-app",
  version: "1.1.0",
  orientation: "portrait",
  icon: "./assets/images/uoa-logo.png",
  scheme: "conference-app",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  splash: {
    image: "./assets/images/uoa-logo.png",
    resizeMode: "contain",
    backgroundColor: "#ffffff",
  },
  ios: {
    supportsTablet: false,
    bundleIdentifier: "org.utaheyedoc.congress2026",
    infoPlist: {
      NSCameraUsageDescription: "Used to scan booth QR codes in the exhibit hall",
    },
  },
  android: {
    package: "org.utaheyedoc.congress2026",
    versionCode: 2,
    adaptiveIcon: {
      foregroundImage: "./assets/images/uoa-logo.png",
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
    favicon: "./assets/images/uoa-logo.png",
  },
  plugins: [
    ["expo-router", { origin: "https://replit.com/" }],
    "expo-font",
    "expo-web-browser",
    "expo-camera",
  ],
  updates: {
    enabled: false,
  },
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: IS_PRODUCTION
    ? { eas: { projectId: PROJECT_ID } }
    : {},
};
