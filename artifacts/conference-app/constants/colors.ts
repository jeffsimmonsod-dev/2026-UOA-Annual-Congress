import config from "@/conference.config";

const colors = {
  light: {
    text: "#0f172a",
    tint: config.primaryColor,

    background: "#f8fafc",
    foreground: "#0f172a",

    card: "#ffffff",
    cardForeground: "#0f172a",

    primary: config.primaryColor,
    primaryForeground: "#ffffff",

    secondary: "#f1f5f9",
    secondaryForeground: "#1e293b",

    muted: "#f1f5f9",
    mutedForeground: "#64748b",

    accent: config.accentColor,
    accentForeground: config.accentForegroundColor,

    destructive: "#ef4444",
    destructiveForeground: "#ffffff",

    border: "#e2e8f0",
    input: "#e2e8f0",

    tag: config.tagColor,
    tagForeground: config.tagForegroundColor,

    success: "#10b981",
    warning: "#f59e0b",
  },

  dark: {
    text: "#f1f5f9",
    tint: config.primaryDarkColor,

    background: "#0f172a",
    foreground: "#f1f5f9",

    card: "#1e293b",
    cardForeground: "#f1f5f9",

    primary: config.primaryDarkColor,
    primaryForeground: "#1e1b4b",

    secondary: "#1e293b",
    secondaryForeground: "#e2e8f0",

    muted: "#1e293b",
    mutedForeground: "#94a3b8",

    accent: config.accentDarkColor,
    accentForeground: config.accentDarkForegroundColor,

    destructive: "#ef4444",
    destructiveForeground: "#ffffff",

    border: "#334155",
    input: "#334155",

    tag: config.tagDarkColor,
    tagForeground: config.tagDarkForegroundColor,

    success: "#10b981",
    warning: "#f59e0b",
  },

  radius: 12,
};

export default colors;
