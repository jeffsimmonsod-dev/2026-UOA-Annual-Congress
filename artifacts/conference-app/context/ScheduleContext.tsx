import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { SESSIONS, PARA_SESSIONS } from "@/services/data";
import type { Session } from "@/types";

const STORAGE_KEY = "@devsummit_my_schedule";

const ALL_SESSIONS: Session[] = [...SESSIONS, ...PARA_SESSIONS];

function parseMinutes(timeStr: string): number {
  const parts = timeStr.trim().split(" ");
  const [h, m] = parts[0].split(":").map(Number);
  const period = parts[1]?.toUpperCase();
  let hours = h;
  if (period === "PM" && h !== 12) hours += 12;
  if (period === "AM" && h === 12) hours = 0;
  return hours * 60 + (m || 0);
}

function sessionsOverlap(a: Session, b: Session): boolean {
  if (a.day !== b.day) return false;
  const aStart = parseMinutes(a.startTime);
  const aEnd = parseMinutes(a.endTime);
  const bStart = parseMinutes(b.startTime);
  const bEnd = parseMinutes(b.endTime);
  return aStart < bEnd && bStart < aEnd;
}

interface ScheduleContextType {
  savedIds: Set<string>;
  isSaved: (sessionId: string) => boolean;
  toggleSession: (sessionId: string) => void;
  checkConflict: (sessionId: string) => Session | null;
}

const ScheduleContext = createContext<ScheduleContextType>({
  savedIds: new Set(),
  isSaved: () => false,
  toggleSession: () => {},
  checkConflict: () => null,
});

export function ScheduleProvider({ children }: { children: React.ReactNode }) {
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          const ids: string[] = JSON.parse(raw);
          setSavedIds(new Set(ids));
        } catch {}
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

  const checkConflict = useCallback(
    (sessionId: string): Session | null => {
      const incoming = ALL_SESSIONS.find((s) => s.id === sessionId);
      if (!incoming) return null;
      for (const savedId of savedIds) {
        if (savedId === sessionId) continue;
        const saved = ALL_SESSIONS.find((s) => s.id === savedId);
        if (saved && sessionsOverlap(incoming, saved)) return saved;
      }
      return null;
    },
    [savedIds]
  );

  const isSaved = useCallback(
    (sessionId: string) => savedIds.has(sessionId),
    [savedIds]
  );

  return (
    <ScheduleContext.Provider value={{ savedIds, isSaved, toggleSession, checkConflict }}>
      {children}
    </ScheduleContext.Provider>
  );
}

export function useSchedule() {
  return useContext(ScheduleContext);
}
