import React, { createContext, useContext } from "react";
import { useColorScheme } from "react-native";

import colors from "@/constants/colors";
import conferenceConfig from "@/conference.config";
import type { ConferenceConfig } from "@/conference.config";

type ColorPalette = typeof colors.light & { radius: number };

interface ThemeContextValue {
  colors: ColorPalette;
  conference: ConferenceConfig;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const scheme = useColorScheme();
  const palette = scheme === "dark" ? colors.dark : colors.light;
  const value: ThemeContextValue = {
    colors: { ...palette, radius: colors.radius },
    conference: conferenceConfig,
  };
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
}
