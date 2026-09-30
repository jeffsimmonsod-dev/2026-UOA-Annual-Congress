import type { ImageSourcePropType } from "react-native";

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
  dataRefreshIntervalMs: number;
}

const conferenceConfig: ConferenceConfig = {
  conferenceId: 1,

  conferenceName: "2026 UOA Annual Congress",
  organizationName: "Utah Optometric Association",
  organizationTagline: "Utah Optometric Association",
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

  logoAsset: require("./assets/images/uoa-logo-trimmed.png"),

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
    : "",
  dataRefreshIntervalMs: 5 * 60 * 1000,
};

export default conferenceConfig;
