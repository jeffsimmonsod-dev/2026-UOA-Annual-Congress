import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

const STORAGE_KEY = "@devsummit_my_schedule";

interface ScheduleContextType {
  savedIds: Set<string>;
  isSaved: (sessionId: string) => boolean;
  toggleSession: (sessionId: string) => void;
}

const ScheduleContext = createContext<ScheduleContextType>({
  savedIds: new Set(),
  isSaved: () => false,
  toggleSession: () => {},
});

export function ScheduleProvider({ children }: { children: React.ReactNode }) {
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          const ids: string[] = JSON.parse(raw);
          setSavedIds(new Set(ids));
        } catch {
        }
      }
    });
  }, []);

  const persist = useCallback((ids: Set<string>) => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(ids)));
  }, []);

  const toggleSession = useCallback(
    (sessionId: string) => {
      setSavedIds((prev) => {
        const next = new Set(prev);
        if (next.has(sessionId)) {
          next.delete(sessionId);
        } else {
          next.add(sessionId);
        }
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const isSaved = useCallback(
    (sessionId: string) => savedIds.has(sessionId),
    [savedIds]
  );

  return (
    <ScheduleContext.Provider value={{ savedIds, isSaved, toggleSession }}>
      {children}
    </ScheduleContext.Provider>
  );
}

export function useSchedule() {
  return useContext(ScheduleContext);
}
