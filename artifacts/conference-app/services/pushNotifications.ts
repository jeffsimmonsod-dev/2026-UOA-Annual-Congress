import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { Platform } from "react-native";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function getApiBase(): string | null {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (!domain || domain === "undefined") return null;
  return `https://${domain}`;
}

// Expo Go on Android does not support remote push notifications (SDK 53+).
// The real EAS build works fine — this guard is for dev-only Expo Go testing.
const isExpoGo = Constants.appOwnership === "expo";

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (Platform.OS === "web") return null;
  if (!Device.isDevice) return null;
  if (isExpoGo && Platform.OS === "android") return null;

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") return null;

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    if (!projectId) {
      console.log("EAS projectId not configured — skipping push token");
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenData.data;

    const apiBase = getApiBase();
    if (apiBase) {
      await fetch(`${apiBase}/api/push/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      }).catch(() => {});
    }

    return token;
  } catch (err) {
    console.log("Push registration skipped:", err);
    return null;
  }
}

export async function sendPushNotification(
  title: string,
  body: string,
  adminPin: string
): Promise<{ success: boolean; message: string }> {
  const apiBase = getApiBase();
  if (!apiBase) {
    return { success: false, message: "API server not configured" };
  }
  try {
    const response = await fetch(`${apiBase}/api/push/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body, adminPin }),
    });
    const data = await response.json();
    if (!response.ok) {
      return { success: false, message: data.error ?? "Send failed" };
    }
    return { success: true, message: `Sent to ${data.sent} device(s)` };
  } catch (err) {
    return { success: false, message: String(err) };
  }
}
