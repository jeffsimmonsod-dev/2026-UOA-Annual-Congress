// Starter content for a new event. Replace everything here with the real
// schedule, speakers, sponsors, venue and FAQ. Speakers, sessions and sponsors
// are also loaded live from the API server (admin dashboard), so this file is
// the offline/first-launch fallback for those.
import type { FaqItem, Session, Speaker, Sponsor, Update, Venue } from "@/types";

export const SPEAKERS: Speaker[] = [
  {
    id: "s1",
    name: "Dr. Jane Example",
    title: "Keynote Speaker",
    company: "Example University",
    bio: "Short speaker bio goes here.",
    photo: "",
    sessionIds: ["d1-keynote"],
  },
  {
    id: "s2",
    name: "Alex Sample",
    title: "Workshop Lead",
    company: "Sample Co.",
    bio: "Short speaker bio goes here.",
    photo: "",
    sessionIds: ["d1-workshop", "d2-panel"],
  },
];

export const SESSIONS: Session[] = [
  {
    id: "d1-registration",
    title: "Registration & Breakfast",
    description: "Pick up your badge and grab breakfast.",
    startTime: "7:30 AM",
    endTime: "8:30 AM",
    day: "Thu, May 6",
    room: "Main Hall",
    track: "General",
    speakerIds: [],
  },
  {
    id: "d1-keynote",
    title: "Opening Keynote",
    description: "Kick off the event with our keynote speaker.",
    startTime: "8:30 AM",
    endTime: "9:30 AM",
    day: "Thu, May 6",
    room: "Main Hall",
    track: "Keynote",
    speakerIds: ["s1"],
  },
  {
    id: "d1-workshop",
    title: "Hands-on Workshop",
    description: "Small-group, hands-on session.",
    startTime: "10:00 AM",
    endTime: "11:30 AM",
    day: "Thu, May 6",
    room: "Room A",
    track: "Workshop",
    speakerIds: ["s2"],
  },
  {
    id: "d2-panel",
    title: "Closing Panel",
    description: "Panel discussion and Q&A.",
    startTime: "9:00 AM",
    endTime: "10:00 AM",
    day: "Fri, May 7",
    room: "Main Hall",
    track: "General",
    speakerIds: ["s2"],
  },
];

// Optional second track (e.g. staff / para education). Leave empty and set
// schedule.paraDays to [] to hide the extra schedule tab.
export const PARA_SESSIONS: Session[] = [];

export const SPONSORS: Sponsor[] = [
  {
    id: "sp1",
    name: "Sample Sponsor",
    tier: "gold",
    logo: "",
    website: "https://example.com",
    description: "Thanks to our sponsor.",
  },
];

export const VENUE: Venue = {
  name: "Sample Convention Center",
  address: "123 Main Street",
  city: "Anytown, ST 00000",
  mapsUrl: "https://maps.google.com/?q=123+Main+Street",
  parkingInfo: "Parking details go here.",
  wifiNetwork: "EventWiFi",
  wifiPassword: "Ask at registration",
  rooms: [
    { id: "r1", name: "Main Hall", capacity: 300, floor: "Level 1", features: ["Keynotes", "Meals"] },
    { id: "r2", name: "Room A", capacity: 60, floor: "Level 1", features: ["Workshops"] },
  ],
};

export const UPDATES: Update[] = [
  {
    id: "u1",
    title: "Welcome!",
    body: "Thanks for downloading the event app. Updates from the organizers will appear here.",
    timestamp: "2027-05-01T09:00:00Z",
    type: "announcement",
  },
];

export const FAQ: FaqItem[] = [
  {
    id: "f1",
    question: "Where do I pick up my badge?",
    answer: "At the registration desk in the Main Hall lobby.",
    category: "General",
  },
  {
    id: "f2",
    question: "Who do I contact with questions?",
    answer: "Email info@example.com or stop by the registration desk.",
    category: "General",
  },
];
