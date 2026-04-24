import { useWindowDimensions } from "react-native";

export const MAX_CONTENT_WIDTH = 720;

export function useTabletLayout() {
  const { width } = useWindowDimensions();
  const isTablet = width >= 600;

  const contentStyle = {
    maxWidth: MAX_CONTENT_WIDTH,
    width: "100%" as const,
    alignSelf: "center" as const,
  };

  const numPhotoColumns = isTablet ? 4 : 2;

  return { isTablet, contentStyle, numPhotoColumns };
}
