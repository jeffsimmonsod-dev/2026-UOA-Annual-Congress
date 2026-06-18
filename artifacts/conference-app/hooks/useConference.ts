import { useTheme } from "@/context/ThemeContext";
import type { ConferenceConfig } from "@/conference.config";

export type { ConferenceConfig };

export function useConference(): ConferenceConfig {
  return useTheme().conference;
}
