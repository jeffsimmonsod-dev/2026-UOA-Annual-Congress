import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useRef, useState } from "react";

const PREFIX = "@uoa_note_";

export function useNote(sessionId: string) {
  const [note, setNote] = useState("");
  const [loaded, setLoaded] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(PREFIX + sessionId).then((val) => {
      if (val !== null) setNote(val);
      setLoaded(true);
    });
  }, [sessionId]);

  const saveNote = useCallback(
    (text: string) => {
      setNote(text);
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        if (text.trim() === "") {
          AsyncStorage.removeItem(PREFIX + sessionId);
        } else {
          AsyncStorage.setItem(PREFIX + sessionId, text);
        }
      }, 600);
    },
    [sessionId]
  );

  return { note, saveNote, loaded };
}

export async function getAllNotes(): Promise<
  Array<{ sessionId: string; note: string }>
> {
  const keys = await AsyncStorage.getAllKeys();
  const noteKeys = keys.filter((k) => k.startsWith(PREFIX));
  if (noteKeys.length === 0) return [];
  const pairs = await AsyncStorage.multiGet(noteKeys);
  return pairs
    .filter(([, val]) => val && val.trim().length > 0)
    .map(([key, val]) => ({
      sessionId: key.replace(PREFIX, ""),
      note: val as string,
    }));
}

export async function deleteNote(sessionId: string) {
  await AsyncStorage.removeItem(PREFIX + sessionId);
}
