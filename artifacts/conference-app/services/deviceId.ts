import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const STORAGE_KEY = "uoa_device_id";

function generateId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let id = "dev_";
  for (let i = 0; i < 24; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

let cachedId: string | null = null;

export async function getDeviceId(): Promise<string> {
  if (cachedId) return cachedId;
  if (Platform.OS === "web") {
    let id = localStorage.getItem(STORAGE_KEY);
    if (!id) {
      id = generateId();
      localStorage.setItem(STORAGE_KEY, id);
    }
    cachedId = id;
    return id;
  }
  const stored = await AsyncStorage.getItem(STORAGE_KEY);
  if (stored) {
    cachedId = stored;
    return stored;
  }
  const newId = generateId();
  await AsyncStorage.setItem(STORAGE_KEY, newId);
  cachedId = newId;
  return newId;
}
