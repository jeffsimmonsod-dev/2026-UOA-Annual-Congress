// 2026 UOA Annual Congress: the original app, kept as the complete demo event.
// Build it with EVENT=uoa-2026 (the default). Store identity is in event.json.
import type { EventDefinition } from "../types";
import app from "./event.json";
import {
  FAQ,
  PARA_SESSIONS,
  SESSIONS,
  SPEAKERS,
  SPONSORS,
  UPDATES,
  VENUE,
} from "./content";
import { exhibitHall } from "./exhibitHall";
import { scheduleTrackColors, trackColors, trackShortLabels } from "./tracks";
import { floorPlans, roomColors } from "./venueMaps";

const event: EventDefinition = {
  slug: "uoa-2026",
  app,
  config: {
    conferenceId: 1,

    conferenceName: app.appName,
    homeTitle: "2026 Annual Congress",
    organizationName: "Utah Optometric Association",
    organizationShortName: "UOA",
    organizationTagline: "Utah Optometric Association",
    eventNoun: "congress",
    brandIcon: "eye-outline",
    dates: "June 4–7, 2026",
    location: "Grand Hyatt Deer Valley, Park City, UT",

    contactName: "Chanae",
    contactPhone: "801-364-9103",
    contactEmail: "uoa@utaheyedoc.org",
    registrationUrl: "https://www.utaheyedoc.org/2026_uoa_annual_congress.php",
    websiteUrl: "https://www.utaheyedoc.org/2026_uoa_annual_congress.php",
    websiteLabel: "utaheyedoc.org · 2026 Annual Congress",

    creditType: "COPE CE Credit",
    paraCreditType: "ABO/CPC Credit Available",

    logoAsset: require("./assets/uoa-logo-trimmed.png"),

    qrBoothPrefix: "uoa2026",

    primaryColor: "#4f46e5",
    primaryDarkColor: "#818cf8",
    secondaryColor: "#f1f5f9",
    secondaryDarkColor: "#1e293b",
    accentColor: "#e0e7ff",
    accentForegroundColor: "#3730a3",
    accentDarkColor: "#312e81",
    accentDarkForegroundColor: "#c7d2fe",
    tagColor: "#ddd6fe",
    tagForegroundColor: "#4338ca",
    tagDarkColor: "#312e81",
    tagDarkForegroundColor: "#a5b4fc",

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
    speakerImages: {
      s1: require("./assets/speakers/borgman.jpg"),
      s2: require("./assets/speakers/echiverri.jpg"),
      s3: require("./assets/speakers/klute.jpg"),
      s4: require("./assets/speakers/petrosyan.jpg"),
      s5: require("./assets/speakers/davies.jpg"),
      s6: require("./assets/speakers/johnston.jpg"),
      s7: require("./assets/speakers/brujic.jpg"),
      s8: require("./assets/speakers/stclair.jpg"),
      s9: require("./assets/speakers/moy.jpg"),
    },
    schedule: {
      doctorDays: ["Thu, June 4", "Fri, June 5", "Sat, June 6", "Sun, June 7"],
      paraDays: ["Thu, June 4", "Fri, June 5", "Sat, June 6"],
      dayDates: {
        "Thu, June 4": "2026-06-04",
        "Fri, June 5": "2026-06-05",
        "Sat, June 6": "2026-06-06",
        "Sun, June 7": "2026-06-07",
      },
      mainScheduleTitle: "Doctor Education Schedule",
      paraScheduleTitle: "Paraoptometric Education",
      paraTabLabel: "Para",
      creditIdLabel: "COPE",
    },
    trackColors,
    scheduleTrackColors,
    trackShortLabels,
    roomColors,
    floorPlans,
    exhibitHall,
    voting: {
      officerSlateDescription:
        "The following officers have been nominated for the 2026–2027 term. No nominations will be accepted from the floor.",
      officerSlate: [
        { role: "President", name: "Dr. Jeff Simmons" },
        { role: "President-Elect", name: "Dr. Collin Gray" },
        { role: "Past President", name: "Dr. Kenyon Anderson" },
        { role: "VP Legislation", name: "Dr. Court Wilkins" },
        { role: "VP Finance", name: "Dr. Kyle Wilson" },
      ],
      trusteeCandidates: [
        "Dr. Steven Blake",
        "Dr. Aaron King",
        "Dr. Jonathon King",
        "Dr. Taylor Linton",
      ],
      maxTrusteeSelections: 3,
      trusteeInstructions: "Please select up to THREE candidates.",
    },
  },
};

export default event;
