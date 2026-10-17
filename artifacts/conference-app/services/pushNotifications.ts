import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { Platform } from "react-native";
import conferenceConfig from "@/conference.config";
import { apiFetch } from "./apiFetch";

// Expo Go on Android SDK 53+ removed push notification native support.
// Any expo-notifications API call throws in that environment.
// Store/EAS builds are unaffected — this guard is Expo Go only.
const isExpoGo = Constants.appOwnership === "expo";
const isExpoGoAndroid = isExpoGo && Platform.OS === "android";
const isWeb = Platform.OS === "web";
const pushSupported = !isWeb && !isExpoGoAndroid;

/** Remembers the last token the server confirmed, for diagnostics only. */
const REGISTERED_TOKEN_KEY = "@uoa_push_registered_token";
/** Must match the channelId the server sends with (see api-server lib/push.ts). */
export const ANDROID_CHANNEL_ID = "default";

if (pushSupported) {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch {
    // unsupported environment
  }
}

function getApiBase(): string | null {
  if (conferenceConfig.apiBaseUrl) return conferenceConfig.apiBaseUrl;
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (!domain || domain === "undefined") return null;
  return `https://${domain}`;
}

/**
 * Android 8+ only shows notifications on an existing channel, and Android 13+
 * only shows the permission prompt once a channel exists. Create it first.
 */
async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: "Announcements",
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#117DAB",
    sound: "default",
  });
}

function getProjectId(): string | null {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId ??
    null
  );
}

async function getExpoToken(): Promise<string> {
  const projectId = getProjectId();
  if (!projectId) throw new Error("EAS projectId is not configured");
  const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
  return tokenData.data;
}

/** Sends the token to our server. Throws (with the HTTP status) if the server did not accept it. */
async function registerTokenWithServer(token: string): Promise<void> {
  const apiBase = getApiBase();
  if (!apiBase) throw new Error("API server not configured");
  const response = await apiFetch(`${apiBase}/api/push/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, platform: Platform.OS }),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    const error = new Error(`Push registration failed: HTTP ${response.status} ${text.slice(0, 200)}`);
    (error as Error & { status?: number }).status = response.status;
    throw error;
  }
  await AsyncStorage.setItem(REGISTERED_TOKEN_KEY, token).catch(() => {});
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const RETRY_DELAYS_MS = [2_000, 10_000, 30_000, 120_000];

/** Gets the Expo token and registers it, retrying with backoff on network/server errors. */
async function registerWithRetry(delays: number[] = RETRY_DELAYS_MS): Promise<boolean> {
  for (let attempt = 0; ; attempt++) {
    try {
      const token = await getExpoToken();
      await registerTokenWithServer(token);
      return true;
    } catch (err) {
      const status = (err as { status?: number }).status;
      // 4xx (other than rate limiting) will not fix itself by retrying.
      const retryable = status === undefined || status === 429 || status >= 500;
      console.warn(`Push registration attempt ${attempt + 1} failed:`, err);
      if (!retryable || attempt >= delays.length) return false;
      await sleep(delays[attempt]);
    }
  }
}

export type EnableResult =
  | { status: "registered" }
  | { status: "denied" }
  | { status: "unsupported" }
  /** Permission granted, but the server did not confirm the token yet; retried on next launch. */
  | { status: "registration_pending" }
  | { status: "failed"; error: string };

/**
 * Called when the user taps "Enable Notifications": creates the Android
 * channel, asks for permission, then registers the token with the server.
 */
export async function enablePushNotificationsAsync(): Promise<EnableResult> {
  if (!pushSupported || !Device.isDevice) return { status: "unsupported" };
  try {
    await ensureAndroidChannel();
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") return { status: "denied" };
    // One quick retry while the prompt is on screen, then keep retrying in the background.
    const ok = await registerWithRetry([2_000]);
    if (ok) return { status: "registered" };
    void registerWithRetry();
    return { status: "registration_pending" };
  } catch (err) {
    console.warn("Enabling push notifications failed:", err);
    return { status: "failed", error: String(err) };
  }
}

/** @deprecated kept for older callers; prefer enablePushNotificationsAsync. */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  const result = await enablePushNotificationsAsync();
  if (result.status !== "registered") return null;
  return AsyncStorage.getItem(REGISTERED_TOKEN_KEY);
}

/**
 * Runs on every app launch. If the user has already granted permission,
 * (re)registers the current token so the server always has a fresh one, and
 * re-registers whenever the OS rotates the device token. Never prompts.
 * Returns a cleanup function.
 */
export function startPushRegistrationSync(): () => void {
  if (!pushSupported || !Device.isDevice) return () => {};
  let cancelled = false;

  (async () => {
    try {
      await ensureAndroidChannel();
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== "granted" || cancelled) return;
      const ok = await registerWithRetry();
      if (!ok) console.warn("Push registration did not succeed this launch; will retry next launch.");
    } catch (err) {
      console.warn("Push registration sync failed:", err);
    }
  })();

  let subscription: { remove: () => void } | null = null;
  try {
    subscription = Notifications.addPushTokenListener(() => {
      // The native (APNs/FCM) token changed; fetch the matching Expo token and re-register.
      if (!cancelled) void registerWithRetry();
    });
  } catch (err) {
    console.warn("Could not listen for push token changes:", err);
  }

  return () => {
    cancelled = true;
    subscription?.remove();
  };
}

export interface SendResult {
  success: boolean;
  message: string;
  sent?: number;
  failed?: number;
  attempted?: number;
  warning?: string;
}

export async function sendPushNotification(
  title: string,
  body: string,
  adminPin: string
): Promise<SendResult> {
  const apiBase = getApiBase();
  if (!apiBase) {
    return { success: false, message: "API server not configured" };
  }
  try {
    const response = await apiFetch(`${apiBase}/api/push/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-pin": adminPin },
      body: JSON.stringify({ title, body }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { success: false, message: data.error ?? `Send failed (HTTP ${response.status})` };
    }
    return {
      success: data.success === true,
      message: data.message ?? (data.success ? `Sent to ${data.sent} device(s)` : "Nothing was sent"),
      sent: data.sent,
      failed: data.failed,
      attempted: data.attempted,
      warning: data.warning,
    };
  } catch (err) {
    return { success: false, message: `Could not reach the server: ${String(err)}` };
  }
}
