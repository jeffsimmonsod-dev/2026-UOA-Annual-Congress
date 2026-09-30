import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AppState } from "react-native";
import { apiFetch } from "@/services/apiFetch";
import conferenceConfig from "@/conference.config";
import {
  SPEAKERS as SEED_SPEAKERS,
  SESSIONS as SEED_SESSIONS,
  PARA_SESSIONS as SEED_PARA_SESSIONS,
  SPONSORS as SEED_SPONSORS,
} from "@/services/data";
import type { Session, Speaker, Sponsor } from "@/types";

interface ConferenceDataContextType {
  speakers: Speaker[];
  docSessions: Session[];
  paraSessions: Session[];
  sponsors: Sponsor[];
  getSessionById: (id: string) => Session | undefined;
  getSpeakerById: (id: string) => Speaker | undefined;
  getSpeakersForSession: (session: Session) => Speaker[];
  getSessionsForSpeaker: (speaker: Speaker) => Session[];
  getSessionsByDay: () => Record<string, Session[]>;
  getParaSessionsByDay: () => Record<string, Session[]>;
  isLoaded: boolean;
}

const ALL_SEED = [...SEED_SESSIONS, ...SEED_PARA_SESSIONS];

const ConferenceDataContext = createContext<ConferenceDataContextType>({
  speakers: SEED_SPEAKERS,
  docSessions: SEED_SESSIONS,
  paraSessions: SEED_PARA_SESSIONS,
  sponsors: SEED_SPONSORS,
  getSessionById: (id) => ALL_SEED.find((s) => s.id === id),
  getSpeakerById: (id) => SEED_SPEAKERS.find((s) => s.id === id),
  getSpeakersForSession: (session) =>
    session.speakerIds.map((id) => SEED_SPEAKERS.find((s) => s.id === id)).filter(Boolean) as Speaker[],
  getSessionsForSpeaker: (speaker) =>
    ALL_SEED.filter((s) => s.speakerIds.includes(speaker.id)),
  getSessionsByDay: () => groupByDay(SEED_SESSIONS),
  getParaSessionsByDay: () => groupByDay(SEED_PARA_SESSIONS),
  isLoaded: false,
});

function parseTime(t: string): number {
  const match = t.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return 0;
  let h = parseInt(match[1]!, 10);
  const m = parseInt(match[2]!, 10);
  const ampm = match[3]!.toUpperCase();
  if (ampm === "PM" && h !== 12) h += 12;
  if (ampm === "AM" && h === 12) h = 0;
  return h * 60 + m;
}

function groupByDay(sessions: Session[]): Record<string, Session[]> {
  const result: Record<string, Session[]> = {};
  for (const session of sessions) {
    if (!result[session.day]) result[session.day] = [];
    result[session.day]!.push(session);
  }
  for (const day of Object.keys(result)) {
    result[day]!.sort((a, b) => parseTime(a.startTime) - parseTime(b.startTime));
  }
  return result;
}

function mapSpeaker(row: Record<string, unknown>): Speaker {
  return {
    id: String(row["external_id"] ?? row["id"]),
    name: String(row["name"] ?? ""),
    title: String(row["title"] ?? ""),
    company: String(row["company"] ?? ""),
    bio: String(row["bio"] ?? ""),
    photo: String(row["photo_url"] ?? ""),
    sessionIds: Array.isArray(row["session_ids"]) ? (row["session_ids"] as string[]) : [],
  };
}

function mapSession(row: Record<string, unknown>): Session {
  return {
    id: String(row["external_id"] ?? row["id"]),
    title: String(row["title"] ?? ""),
    description: String(row["description"] ?? ""),
    startTime: String(row["start_time"] ?? ""),
    endTime: String(row["end_time"] ?? ""),
    day: String(row["day"] ?? ""),
    room: String(row["room"] ?? ""),
    track: String(row["track"] ?? ""),
    speakerIds: Array.isArray(row["speaker_ids"]) ? (row["speaker_ids"] as string[]) : [],
    tags: Array.isArray(row["tags"]) ? (row["tags"] as string[]) : [],
  };
}

function mapSponsor(row: Record<string, unknown>): Sponsor {
  const tier = String(row["tier"] ?? "bronze") as Sponsor["tier"];
  return {
    id: String(row["external_id"] ?? row["id"]),
    name: String(row["name"] ?? ""),
    tier,
    logo: String(row["logo_url"] ?? ""),
    website: String(row["website"] ?? ""),
    description: String(row["description"] ?? ""),
  };
}

// Preserve array references when a poll returns the same content, so consumers do not
// re-render merely because a new response arrived.
function keepIfUnchanged<T>(previous: T[], next: T[]): T[] {
  return JSON.stringify(previous) === JSON.stringify(next) ? previous : next;
}

export function ConferenceDataProvider({ children }: { children: React.ReactNode }) {
  const [speakers, setSpeakers] = useState<Speaker[]>(SEED_SPEAKERS);
  const [docSessions, setDocSessions] = useState<Session[]>(SEED_SESSIONS);
  const [paraSessions, setParaSessions] = useState<Session[]>(SEED_PARA_SESSIONS);
  const [sponsors, setSponsors] = useState<Sponsor[]>(SEED_SPONSORS);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const base = conferenceConfig.apiBaseUrl;
    const confId = conferenceConfig.conferenceId;
    let mounted = true;
    let inFlight = false;
    let firstLoad = true;
    let previousAppState = AppState.currentState;
    const controller = new AbortController();

    async function fetchRows(key: "speakers" | "sessions" | "sponsors"): Promise<Record<string, unknown>[] | null> {
      try {
        const response = await apiFetch(`${base}/api/conferences/${confId}/${key}`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json() as Record<string, unknown>;
        if (!Array.isArray(data[key])) throw new Error(`Invalid ${key} response`);
        return data[key] as Record<string, unknown>[];
      } catch (error) {
        if (!controller.signal.aborted) console.warn(`Could not refresh ${key}`, error);
        return null;
      }
    }

    async function fetchAll() {
      if (inFlight || !mounted) return;
      inFlight = true;
      try {
        const [speakerRows, sessionRows, sponsorRows] = await Promise.all([
          fetchRows("speakers"),
          fetchRows("sessions"),
          fetchRows("sponsors"),
        ]);
        if (!mounted) return;
        if (speakerRows) {
          setSpeakers((previous) => keepIfUnchanged(previous, speakerRows.map(mapSpeaker)));
        }
        if (sessionRows) {
          setDocSessions((previous) =>
            keepIfUnchanged(previous, sessionRows.filter((row) => !row["is_para"]).map(mapSession))
          );
          setParaSessions((previous) =>
            keepIfUnchanged(previous, sessionRows.filter((row) => !!row["is_para"]).map(mapSession))
          );
        }
        if (sponsorRows) {
          setSponsors((previous) => keepIfUnchanged(previous, sponsorRows.map(mapSponsor)));
        }
      } finally {
        inFlight = false;
        if (mounted && firstLoad) {
          firstLoad = false;
          setIsLoaded(true);
        }
      }
    }

    void fetchAll();
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (
        nextState === "active" &&
        (previousAppState === "background" || previousAppState === "inactive")
      ) {
        void fetchAll();
      }
      previousAppState = nextState;
    });
    const interval = conferenceConfig.dataRefreshIntervalMs > 0
      ? setInterval(() => {
          if (AppState.currentState === "active") void fetchAll();
        }, conferenceConfig.dataRefreshIntervalMs)
      : undefined;

    return () => {
      mounted = false;
      controller.abort();
      subscription.remove();
      if (interval) clearInterval(interval);
    };
  }, []);

  const getSessionById = useCallback(
    (id: string) => [...docSessions, ...paraSessions].find((s) => s.id === id),
    [docSessions, paraSessions]
  );

  const getSpeakerById = useCallback(
    (id: string) => speakers.find((s) => s.id === id),
    [speakers]
  );

  const getSpeakersForSession = useCallback(
    (session: Session) =>
      session.speakerIds
        .map((id) => speakers.find((s) => s.id === id))
        .filter(Boolean) as Speaker[],
    [speakers]
  );

  const getSessionsForSpeaker = useCallback(
    (speaker: Speaker) => {
      const all = [...docSessions, ...paraSessions];
      return all.filter((s) => s.speakerIds.includes(speaker.id));
    },
    [docSessions, paraSessions]
  );

  const getSessionsByDay = useCallback(() => groupByDay(docSessions), [docSessions]);
  const getParaSessionsByDay = useCallback(() => groupByDay(paraSessions), [paraSessions]);
  const value = useMemo(() => ({
    speakers,
    docSessions,
    paraSessions,
    sponsors,
    getSessionById,
    getSpeakerById,
    getSpeakersForSession,
    getSessionsForSpeaker,
    getSessionsByDay,
    getParaSessionsByDay,
    isLoaded,
  }), [
    speakers, docSessions, paraSessions, sponsors, getSessionById, getSpeakerById,
    getSpeakersForSession, getSessionsForSpeaker, getSessionsByDay, getParaSessionsByDay, isLoaded,
  ]);

  return (
    <ConferenceDataContext.Provider value={value}>
      {children}
    </ConferenceDataContext.Provider>
  );
}

export function useConferenceData() {
  return useContext(ConferenceDataContext);
}
