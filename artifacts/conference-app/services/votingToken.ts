import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import conferenceConfig from "@/conference.config";
import { apiFetch } from "./apiFetch";

// Server-signed voting token. The server issues it (POST /api/voting/device)
// and only accepts votes carrying a valid token, one vote per token.
// Tokens are bound to one conference, so the key includes the conference ID.
const STORAGE_KEY = `uoa_voting_token_${conferenceConfig.conferenceId}`;

let cached: string | null = null;

async function readStored(): Promise<string | null> {
  if (Platform.OS === "web") return localStorage.getItem(STORAGE_KEY);
  return AsyncStorage.getItem(STORAGE_KEY);
}

async function writeStored(value: string | null): Promise<void> {
  if (Platform.OS === "web") {
    if (value) localStorage.setItem(STORAGE_KEY, value);
    else localStorage.removeItem(STORAGE_KEY);
    return;
  }
  if (value) await AsyncStorage.setItem(STORAGE_KEY, value);
  else await AsyncStorage.removeItem(STORAGE_KEY);
}

export async function getVotingToken(apiBase: string): Promise<string> {
  if (cached) return cached;
  const stored = await readStored();
  if (stored) {
    cached = stored;
    return stored;
  }
  const res = await apiFetch(`${apiBase}/api/voting/device`, { method: "POST" });
  if (!res.ok) throw new Error(`voting token request failed: ${res.status}`);
  const data = (await res.json()) as { votingToken?: string };
  if (!data.votingToken) throw new Error("voting token missing in response");
  await writeStored(data.votingToken);
  cached = data.votingToken;
  return data.votingToken;
}

/** Drops a token the server rejected so a fresh one is fetched next time. */
export async function clearVotingToken(): Promise<void> {
  cached = null;
  await writeStored(null);
}
