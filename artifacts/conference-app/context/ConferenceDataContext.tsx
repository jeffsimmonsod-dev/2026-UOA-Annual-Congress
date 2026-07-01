import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
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

export function ConferenceDataProvider({ children }: { children: React.ReactNode }) {
  const [speakers, setSpeakers] = useState<Speaker[]>(SEED_SPEAKERS);
  const [docSessions, setDocSessions] = useState<Session[]>(SEED_SESSIONS);
  const [paraSessions, setParaSessions] = useState<Session[]>(SEED_PARA_SESSIONS);
  const [sponsors, setSponsors] = useState<Sponsor[]>(SEED_SPONSORS);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const base = conferenceConfig.apiBaseUrl;
    const confId = conferenceConfig.conferenceId;

    async function fetchAll() {
      try {
        const [spRes, sessRes, spnRes] = await Promise.all([
          apiFetch(`${base}/api/conferences/${confId}/speakers`),
          apiFetch(`${base}/api/conferences/${confId}/sessions`),
          apiFetch(`${base}/api/conferences/${confId}/sponsors`),
        ]);

        if (spRes.ok) {
          const data = await spRes.json() as { speakers: Record<string, unknown>[] };
          if (Array.isArray(data.speakers)) {
            setSpeakers(data.speakers.map(mapSpeaker));
          }
        }

        if (sessRes.ok) {
          const data = await sessRes.json() as { sessions: Record<string, unknown>[] };
          if (Array.isArray(data.sessions)) {
            setDocSessions(data.sessions.filter((r) => !r["is_para"]).map(mapSession));
            setParaSessions(data.sessions.filter((r) => !!r["is_para"]).map(mapSession));
          }
        }

        if (spnRes.ok) {
          const data = await spnRes.json() as { sponsors: Record<string, unknown>[] };
          if (Array.isArray(data.sponsors)) {
            setSponsors(data.sponsors.map(mapSponsor));
          }
        }
      } catch {
      } finally {
        setIsLoaded(true);
      }
    }

    fetchAll();
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

  return (
    <ConferenceDataContext.Provider
      value={{
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
      }}
    >
      {children}
    </ConferenceDataContext.Provider>
  );
}

export function useConferenceData() {
  return useContext(ConferenceDataContext);
}
