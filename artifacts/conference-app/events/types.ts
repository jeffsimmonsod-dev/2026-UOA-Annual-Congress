/**
 * Types every event folder (events/<slug>/index.ts) must satisfy.
 *
 * The app is built for exactly ONE event at a time. Which one is chosen by the
 * EVENT environment variable (see app.config.ts and metro.config.js); the
 * selected folder is exposed to app code as the "@event" module.
 */
import type { ImageSourcePropType } from "react-native";
import type { FaqItem, Session, Speaker, Sponsor, Update, Venue } from "@/types";

/** Native/store identity read by app.config.ts. Lives in events/<slug>/event.json. */
export interface EventAppJson {
  /** Store / home-screen app name. */
  appName: string;
  /** Marketing version shown in the stores (e.g. "1.0.0"). */
  version: string;
  /** Expo project slug. Must match the EAS project below. */
  expoSlug: string;
  /** EAS project ID (expo.dev → project → Overview). One per store app. */
  easProjectId: string;
  /** Optional Expo account that owns the EAS project. */
  owner?: string;
  /** Deep-link URL scheme. */
  scheme: string;
  /** Domain of the API server (no https://). EXPO_PUBLIC_DOMAIN overrides it. */
  serverDomain: string;
  ios: {
    bundleIdentifier: string;
    buildNumber?: string;
    cameraUsageDescription: string;
  };
  android: {
    package: string;
    versionCode?: number;
  };
  /** Image files, relative to events/<slug>/assets/. */
  images: {
    icon: string;
    adaptiveIcon: string;
    splash: string;
    notificationIcon: string;
    favicon: string;
  };
  colors: {
    splashBackground: string;
    adaptiveIconBackground: string;
    notification: string;
  };
}

export interface ConferenceConfig {
  /** Row id in the server's `conferences` table (sent as X-Conference-Id). */
  conferenceId: number;
  conferenceName: string;
  /** Title shown large on the Home screen. */
  homeTitle: string;
  organizationName: string;
  /** Short org name used in staff/admin copy, e.g. "UOA". */
  organizationShortName: string;
  organizationTagline: string;
  /** What attendees call the event in sentences, e.g. "congress", "conference". */
  eventNoun: string;
  /** Ionicons name shown next to the event name on the More tab. */
  brandIcon: string;
  dates: string;
  location: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  registrationUrl: string;
  websiteUrl: string;
  websiteLabel: string;
  creditType: string;
  paraCreditType: string;
  logoAsset: ImageSourcePropType;
  qrBoothPrefix: string;
  primaryColor: string;
  primaryDarkColor: string;
  secondaryColor: string;
  secondaryDarkColor: string;
  accentColor: string;
  accentForegroundColor: string;
  accentDarkColor: string;
  accentDarkForegroundColor: string;
  tagColor: string;
  tagForegroundColor: string;
  tagDarkColor: string;
  tagDarkForegroundColor: string;
  apiBaseUrl: string;
  dataRefreshIntervalMs: number;
}

export interface OverlayRect { x: number; y: number; w: number; h: number }
export interface RoomOverlay { room: string; rects: OverlayRect[] }

export interface FloorPlan {
  id: string;
  label: string;
  source: ImageSourcePropType;
  nativeW: number;
  nativeH: number;
  rooms: string[];
  /** Default highlighted room areas (in image pixels). Admins can recalibrate in-app. */
  overlays: RoomOverlay[];
}

export interface BoothZone { id: string; x: number; y: number; w: number; h: number }

export interface ExhibitHallContent {
  mapImage: ImageSourcePropType;
  /** Pixel size of mapImage. */
  mapWidth: number;
  mapHeight: number;
  /** Tap targets over the map, in mapImage pixels. */
  boothZones: BoothZone[];
  /** Short booth labels keyed by booth number (map + passport). */
  boothNames: Record<string, string>;
  /** Full exhibitor directory. */
  directory: { booth: string; company: string }[];
}

export interface VotingContent {
  officerSlateDescription: string;
  officerSlate: { role: string; name: string }[];
  /** NOTE: the server currently validates trustee names itself (api-server/src/routes/voting.ts). */
  trusteeCandidates: string[];
  maxTrusteeSelections: number;
  trusteeInstructions: string;
}

export interface ScheduleContent {
  /** Day labels exactly as used in Session.day, in order. */
  doctorDays: string[];
  /** Days that have a para/secondary track. Empty array hides the Para tab. */
  paraDays: string[];
  /** Day label → ISO date (YYYY-MM-DD); used for "up next" logic. */
  dayDates: Record<string, string>;
  mainScheduleTitle: string;
  paraScheduleTitle: string;
  paraTabLabel: string;
  /** Label for Session.copeId, e.g. "COPE". */
  creditIdLabel: string;
}

export interface EventContent {
  speakers: Speaker[];
  sessions: Session[];
  paraSessions: Session[];
  sponsors: Sponsor[];
  venue: Venue;
  updates: Update[];
  faq: FaqItem[];
  /** Bundled speaker photos keyed by speaker id (falls back to Speaker.photo URL). */
  speakerImages: Record<string, ImageSourcePropType>;
  schedule: ScheduleContent;
  /** Track → color. `scheduleTrackColors` optionally overrides it on the Schedule tab. */
  trackColors: Record<string, string>;
  scheduleTrackColors?: Record<string, string>;
  trackShortLabels: Record<string, string>;
  roomColors: Record<string, string>;
  floorPlans: FloorPlan[];
  /** null hides the Exhibit Hall / passport feature. */
  exhibitHall: ExhibitHallContent | null;
  /** null hides Business Meeting Voting. */
  voting: VotingContent | null;
}

export interface EventDefinition {
  slug: string;
  app: EventAppJson;
  config: ConferenceConfig;
  content: EventContent;
}
