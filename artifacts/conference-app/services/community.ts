import AsyncStorage from "@react-native-async-storage/async-storage";
import conferenceConfig from "@/conference.config";
import { apiFetch } from "@/services/apiFetch";

export const API_BASE =
  conferenceConfig.apiBaseUrl || `https://${process.env.EXPO_PUBLIC_DOMAIN}`;
const LEGACY_PHOTO_SESSION_TOKEN_KEY = "@photo_session_token";
export const PHOTO_SESSION_TOKEN_KEY = `${LEGACY_PHOTO_SESSION_TOKEN_KEY}:${conferenceConfig.conferenceId}`;

export async function getOrCreatePhotoSessionToken(): Promise<string> {
  const stored = await AsyncStorage.getItem(PHOTO_SESSION_TOKEN_KEY);
  if (stored) return stored;
  // The unscoped key predates multi-conference support. Its only known owner is
  // the original conference (ID 1), so never carry it into another conference.
  if (conferenceConfig.conferenceId === 1) {
    const legacyToken = await AsyncStorage.getItem(LEGACY_PHOTO_SESSION_TOKEN_KEY);
    if (legacyToken) {
      await AsyncStorage.setItem(PHOTO_SESSION_TOKEN_KEY, legacyToken);
      await AsyncStorage.removeItem(LEGACY_PHOTO_SESSION_TOKEN_KEY);
      return legacyToken;
    }
  }
  const res = await apiFetch(`${API_BASE}/api/photos/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`Failed to create session (${res.status})`);
  const { sessionToken } = await res.json();
  await AsyncStorage.setItem(PHOTO_SESSION_TOKEN_KEY, sessionToken);
  return sessionToken;
}

export async function communityRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await apiFetch(`${API_BASE}${path}`, options);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.error || payload?.message || `Request failed (${response.status})`;
    throw new Error(String(message));
  }
  return payload as T;
}