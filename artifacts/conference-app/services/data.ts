// Seed/static content for the event this app is built for (events/<EVENT>/).
// Speakers, sessions and sponsors are refreshed from the API at runtime; see
// context/ConferenceDataContext.tsx.
import event from "@event";
import type { Session, Speaker, Sponsor, Venue, Update, FaqItem } from "@/types";

export const SPEAKERS: Speaker[] = event.content.speakers;
export const SESSIONS: Session[] = event.content.sessions;
export const PARA_SESSIONS: Session[] = event.content.paraSessions;
export const SPONSORS: Sponsor[] = event.content.sponsors;
export const VENUE: Venue = event.content.venue;
export const UPDATES: Update[] = event.content.updates;
export const FAQ: FaqItem[] = event.content.faq;
