const { getDefaultConfig } = require("expo/metro-config");
const fs = require("fs");
const path = require("path");

const config = getDefaultConfig(__dirname);

const workletsWebShim = path.resolve(__dirname, "shims/react-native-worklets-web.js");

// Which event folder (events/<slug>) this bundle is built for. Must match the
// EVENT used by app.config.ts. Only the selected event's content and images are
// bundled into the app. After switching EVENT locally, restart with `expo start -c`.
const eventSlug = (process.env.EVENT || "").trim() || "uoa-2026";
const eventEntry = path.resolve(__dirname, "events", eventSlug, "index.ts");
if (!fs.existsSync(eventEntry)) {
  throw new Error(`EVENT="${eventSlug}" not found: expected ${eventEntry}`);
}

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "@event") {
    return { filePath: eventEntry, type: "sourceFile" };
  }
  if (platform === "web" && moduleName === "react-native-worklets") {
    return { filePath: workletsWebShim, type: "sourceFile" };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
