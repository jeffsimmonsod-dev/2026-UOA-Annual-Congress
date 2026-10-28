// Blank starter event. Copy this folder to events/<your-slug>/ to start a new
// conference app; see docs/NEW_EVENT.md for the full launch checklist.
// Store identity (app name, bundle IDs, EAS project, icons) is in event.json.
import type { EventDefinition } from "../types";
import app from "./event.json";
import { FAQ, PARA_SESSIONS, SESSIONS, SPEAKERS, SPONSORS, UPDATES, VENUE } from "./content";

const event: EventDefinition = {
  slug: "sample-event",
  app,
  config: {
    // Row id in the server's `conferences` table (create it in the admin dashboard).
    conferenceId: 0,

    conferenceName: app.appName,
    homeTitle: "Sample Event 2027",
    organizationName: "Sample Organization",
    organizationShortName: "Sample Org",
    organizationTagline: "Sample Organization",
    eventNoun: "event",
    brandIcon: "calendar-outline",
    dates: "May 6–7, 2027",
    location: "Sample Convention Center, Anytown",

    contactName: "Event Staff",
    contactPhone: "555-555-0100",
    contactEmail: "info@example.com",
    registrationUrl: "https://example.com/register",
    websiteUrl: "https://example.com",
    websiteLabel: "example.com",

    creditType: "CE Credit",
    paraCreditType: "CE Credit",

    logoAsset: require("./assets/logo.png"),

    // Prefix printed in booth QR codes: <prefix>:booth:<id>. Keep unique per event.
    qrBoothPrefix: "sample2027",

    primaryColor: "#0f766e",
    primaryDarkColor: "#5eead4",
    secondaryColor: "#f1f5f9",
    secondaryDarkColor: "#1e293b",
    accentColor: "#ccfbf1",
    accentForegroundColor: "#115e59",
    accentDarkColor: "#134e4a",
    accentDarkForegroundColor: "#99f6e4",
    tagColor: "#ccfbf1",
    tagForegroundColor: "#0f766e",
    tagDarkColor: "#134e4a",
    tagDarkForegroundColor: "#5eead4",

    apiBaseUrl: process.env.EXPO_PUBLIC_DOMAIN
      ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
      : `https://${app.serverDomain}`,
    dataRefreshIntervalMs: 5 * 60 * 1000,
  },
  content: {
    speakers: SPEAKERS,
    sessions: SESSIONS,
    paraSessions: PARA_SESSIONS,
    sponsors: SPONSORS,
    venue: VENUE,
    updates: UPDATES,
    faq: FAQ,
    // Optional bundled speaker photos: { s1: require("./assets/speakers/jane.jpg") }.
    // Otherwise Speaker.photo (a URL) is used.
    speakerImages: {},
    schedule: {
      doctorDays: ["Thu, May 6", "Fri, May 7"],
      paraDays: [],
      dayDates: {
        "Thu, May 6": "2027-05-06",
        "Fri, May 7": "2027-05-07",
      },
      mainScheduleTitle: "Schedule",
      paraScheduleTitle: "Staff Education",
      paraTabLabel: "Staff",
      creditIdLabel: "CE",
    },
    trackColors: {
      General: "#64748b",
      Keynote: "#0f766e",
      Workshop: "#f59e0b",
    },
    trackShortLabels: {},
    roomColors: {
      "Main Hall": "#0f766e",
      "Room A": "#f59e0b",
    },
    // Add floor plan images to ./assets and list them here to show venue maps.
    floorPlans: [],
    // Set to an ExhibitHallContent object (see events/uoa-2026/exhibitHall.ts)
    // to turn on the exhibit hall map + booth passport.
    exhibitHall: null,
    // Set to a VotingContent object (see events/uoa-2026/index.ts) to turn on voting.
    voting: null,
  },
};

export default event;
