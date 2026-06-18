import conferenceConfig from "@/conference.config";
import type { ConferenceConfig } from "@/conference.config";

export type { ConferenceConfig };

export function useConference(): ConferenceConfig {
  return conferenceConfig;
}
