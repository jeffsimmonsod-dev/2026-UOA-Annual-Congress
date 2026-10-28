import React from "react";
import { Image, View, Text, StyleSheet } from "react-native";
import event from "@event";


// ─── Map image (from the event folder) ─────────────────────────────────────────
const MAP_IMAGE = event.content.exhibitHall?.mapImage;

// Booth name lookup (used by directory & passport)
export const BOOTH_NAMES: Record<string, string> = event.content.exhibitHall?.boothNames ?? {};

// Natural dimensions of the supplied image (portrait)
const IMG_W = 795;
const IMG_H = 1024;

interface Props {
  visitedBooths: string[];
  scale?: number;
}

export default function ExhibitHallMap({ visitedBooths, scale = 1 }: Props) {
  const w = IMG_W * scale;
  const h = IMG_H * scale;

  const visited = visitedBooths.filter(Boolean);
  if (!MAP_IMAGE) return null;

  return (
    <View style={{ width: w }}>
      <Image
        source={MAP_IMAGE}
        style={{ width: w, height: h }}
        resizeMode="contain"
      />

      {visited.length > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            ✓ {visited.length} booth{visited.length !== 1 ? "s" : ""} visited:{" "}
            {visited.join(", ")}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    marginTop: 6,
    marginHorizontal: 8,
    backgroundColor: "#d1fae5",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#6ee7b7",
  },
  badgeText: {
    fontSize: 12,
    color: "#065f46",
    fontWeight: "600",
    flexWrap: "wrap",
  },
});
