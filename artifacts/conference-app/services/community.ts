import AsyncStorage from "@react-native-async-storage/async-storage";
import conferenceConfig from "@/conference.config";
import { apiFetch } from "@/services/apiFetch";

export const API_BASE =
  conferenceConfig.apiBaseUrl || `https://${process.env.EXPO_PUBLIC_DOMAIN}`;
const LEGACY_PHOTO_SESSION_TOKEN_KEY = "@photo_session_token";
export const PHOTO_SESSION_TOKEN_KEY = `${LEGACY_PHOTO_SESSION_TOKEN_KEY}:${conferenceConfig.conferenceId}`;

/** An HTTP error from a community/photo request, with the status the server sent. */
export class CommunityRequestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "CommunityRequestError";
  }
}

/**
 * True when the server rejected the session token itself (not the content):
 *  - 403 "Invalid session token for this conference" (community routes)
 *  - 403 "Invalid session token" (photo like/upload routes)
 *  - 400 "A valid sessionToken is required" / "sessionToken required"
 * Other 403s (e.g. "Community posting is restricted") must NOT trigger a new token.
 */
export function isSessionTokenRejected(status: number, message: string): boolean {
  if (status === 403) return /^Invalid session token/i.test(message);
  if (status === 400) return /^(A valid sessionToken is required|sessionToken required)/i.test(message);
  return false;
}

// ── Token change notifications (so screens holding the token in state update) ──
type TokenListener = (token: string) => void;
const tokenListeners = new Set<TokenListener>();
export function onPhotoSessionTokenChange(listener: TokenListener): () => void {
  tokenListeners.add(listener);
  return () => { tokenListeners.delete(listener); };
}

// ── Community display name, re-sent for a replacement token ──────────────────
let communityProfileName = "";
/** Remember the attendee's name so a replacement session gets the same community profile. */
export function setCommunityProfileName(name: string | null | undefined) {
  communityProfileName = (name ?? "").trim();
}

async function createPhotoSessionToken(): Promise<string> {
  const res = await apiFetch(`${API_BASE}/api/photos/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`Failed to create session (${res.status})`);
  const { sessionToken } = await res.json();
  if (typeof sessionToken !== "string" || !sessionToken) throw new Error("Failed to create session");
  await AsyncStorage.setItem(PHOTO_SESSION_TOKEN_KEY, sessionToken);
  return sessionToken;
}

let pendingToken: Promise<string> | null = null;

export async function getOrCreatePhotoSessionToken(): Promise<string> {
  const stored = await AsyncStorage.getItem(PHOTO_SESSION_TOKEN_KEY);
  if (stored) return stored;
  // Share one in-flight request so parallel callers don't each create a session.
  if (pendingToken) return pendingToken;
  pendingToken = (async () => {
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
    return createPhotoSessionToken();
  })().finally(() => { pendingToken = null; });
  return pendingToken;
}

let pendingReplacement: Promise<string> | null = null;

/**
 * The server no longer recognises `rejectedToken` for this conference (for
 * example a token saved by an older app version, or one the database lost).
 * Forget it, create a fresh one, re-post the community name for it, and tell
 * listeners. Concurrent callers share a single replacement.
 */
export async function replacePhotoSessionToken(rejectedToken: string): Promise<string> {
  if (pendingReplacement) return pendingReplacement;
  pendingReplacement = (async () => {
    const stored = await AsyncStorage.getItem(PHOTO_SESSION_TOKEN_KEY);
    // Another request already replaced it; use the new one.
    if (stored && stored !== rejectedToken) return stored;
    await AsyncStorage.removeItem(PHOTO_SESSION_TOKEN_KEY);
    if (conferenceConfig.conferenceId === 1) {
      // Never resurrect the same legacy token after the server rejected it.
      const legacy = await AsyncStorage.getItem(LEGACY_PHOTO_SESSION_TOKEN_KEY);
      if (legacy === rejectedToken) await AsyncStorage.removeItem(LEGACY_PHOTO_SESSION_TOKEN_KEY);
    }
    const fresh = await createPhotoSessionToken();
    if (communityProfileName) {
      // Best effort: link the attendee's community name to the new session.
      await rawCommunityRequest("/api/community/profile", jsonRequest("POST", { sessionToken: fresh, name: communityProfileName }))
        .catch((error) => console.warn("Could not restore community profile for the new session:", error));
    }
    tokenListeners.forEach((listener) => listener(fresh));
    return fresh;
  })().finally(() => { pendingReplacement = null; });
  return pendingReplacement;
}

export function jsonRequest(method: string, body: unknown): RequestInit {
  return { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

async function rawCommunityRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await apiFetch(`${API_BASE}${path}`, options);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.error || payload?.message || `Request failed (${response.status})`;
    throw new CommunityRequestError(String(message), response.status);
  }
  return payload as T;
}

/** A community request that does not carry a session token. */
export function communityRequest<T>(path: string, options?: RequestInit): Promise<T> {
  return rawCommunityRequest<T>(path, options);
}

/**
 * Runs `action` with the current session token. If the server rejects the
 * token itself, gets a replacement and retries exactly once.
 */
export async function withPhotoSession<T>(action: (sessionToken: string) => Promise<T>): Promise<T> {
  const token = await getOrCreatePhotoSessionToken();
  try {
    return await action(token);
  } catch (error) {
    if (!(error instanceof CommunityRequestError) || !isSessionTokenRejected(error.status, error.message)) throw error;
    const fresh = await replacePhotoSessionToken(token);
    return action(fresh);
  }
}

/**
 * A community request that needs the session token. For GET the token goes in
 * the query string; otherwise it is added to the JSON body. Recovers once from
 * a rejected token (see withPhotoSession).
 */
export function sessionRequest<T>(
  path: string,
  options: { method?: "GET" | "POST" | "DELETE"; body?: Record<string, unknown> } = {},
): Promise<T> {
  const method = options.method ?? "GET";
  return withPhotoSession((sessionToken) => {
    if (method === "GET") {
      const separator = path.includes("?") ? "&" : "?";
      return rawCommunityRequest<T>(`${path}${separator}sessionToken=${encodeURIComponent(sessionToken)}`);
    }
    return rawCommunityRequest<T>(path, jsonRequest(method, { ...(options.body ?? {}), sessionToken }));
  });
}
