import type { PropsWithChildren } from "react";
import { Platform, useWindowDimensions } from "react-native";
import { SafeAreaInsetsContext, useSafeAreaInsets } from "react-native-safe-area-context";

// The phone preview's island is drawn outside the web page, so browsers report
// no inset for it. Native devices continue to use their measured safe area.
export function PreviewSafeArea({ children }: PropsWithChildren) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const top = Platform.OS === "web" && width <= 600 ? Math.max(insets.top, 59) : insets.top;

  return (
    <SafeAreaInsetsContext.Provider value={{ ...insets, top }}>
      {children}
    </SafeAreaInsetsContext.Provider>
  );
}