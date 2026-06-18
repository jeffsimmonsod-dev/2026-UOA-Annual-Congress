import type { ImageSourcePropType } from "react-native";
import { CONFERENCE_META } from "./conference.meta";

export interface ConferenceConfig {
  conferenceId: number;
  conferenceName: string;
  organizationName: string;
  organizationTagline: string;
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
}

const conferenceConfig: ConferenceConfig = {
  ...CONFERENCE_META,

  logoAsset: require("./assets/images/uoa-logo.png"),

  apiBaseUrl: process.env.EXPO_PUBLIC_DOMAIN
    ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
    : "",
};

export default conferenceConfig;
