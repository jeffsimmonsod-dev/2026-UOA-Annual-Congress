// Runtime branding/config for the event this app is built for. The values live
// in events/<EVENT>/index.ts; this file just re-exports them so existing
// imports (`@/conference.config`) keep working.
import event from "@event";
import type { ConferenceConfig } from "@/events/types";

export type { ConferenceConfig };

const conferenceConfig: ConferenceConfig = event.config;

export default conferenceConfig;
