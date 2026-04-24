import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Dimensions,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { getRoomColor } from "@/constants/roomColors";
import { VENUE } from "@/services/data";

const SCREEN = Dimensions.get("window");

const FLOOR_PLANS = [
  {
    id: "lake",
    label: "Lake Level",
    subtitle: "Deer Creek Ballroom · Jordanelle Ballroom · Strawberry Conference Room",
    source: require("@/assets/images/floorplan-lake-level.png"),
    rooms: [
      "Deer Creek Ballroom",
      "Jordanelle Ballroom",
      "Strawberry Conference Room",
    ],
  },
  {
    id: "mid",
    label: "Mid Mountain Level",
    subtitle: "Empire Conference Room · Dutch Conference Room",
    source: require("@/assets/images/floorplan-mid-mountain.png"),
    rooms: [
      "Empire Conference Room",
      "Dutch Conference Room",
    ],
  },
];

// ─── Zoomable image — same pattern as photos.tsx ────────────────────────────
function ZoomableImage({ source }: { source: ReturnType<typeof require> }) {
  const W = SCREEN.width;
  const H = SCREEN.height * 0.78;

  const scale = useSharedValue(1);
  const offsetX = useSharedValue(0);
  const offsetY = useSharedValue(0);
  const savedScale = useSharedValue(1);
  const savedOffsetX = useSharedValue(0);
  const savedOffsetY = useSharedValue(0);

  const ANIM = { duration: 280, easing: Easing.out(Easing.cubic) };

  const resetToFit = () => {
    "worklet";
    scale.value = withTiming(1, ANIM);
    offsetX.value = withTiming(0, ANIM);
    offsetY.value = withTiming(0, ANIM);
    savedScale.value = 1;
    savedOffsetX.value = 0;
    savedOffsetY.value = 0;
  };

  const clampOffset = (x: number, y: number, s: number) => {
    "worklet";
    const maxX = Math.max(0, (W * (s - 1)) / 2);
    const maxY = Math.max(0, (H * (s - 1)) / 2);
    return {
      x: Math.min(maxX, Math.max(-maxX, x)),
      y: Math.min(maxY, Math.max(-maxY, y)),
    };
  };

  const pinchGesture = Gesture.Pinch()
    .onBegin(() => {
      savedScale.value = scale.value;
      savedOffsetX.value = offsetX.value;
      savedOffsetY.value = offsetY.value;
    })
    .onUpdate((e) => {
      const newScale = Math.min(6, Math.max(1, savedScale.value * e.scale));
      scale.value = newScale;
      const fx = e.focalX - W / 2;
      const fy = e.focalY - H / 2;
      const delta = newScale / savedScale.value - 1;
      const clamped = clampOffset(
        savedOffsetX.value - fx * delta,
        savedOffsetY.value - fy * delta,
        newScale
      );
      offsetX.value = clamped.x;
      offsetY.value = clamped.y;
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      savedOffsetX.value = offsetX.value;
      savedOffsetY.value = offsetY.value;
      if (scale.value < 1.05) resetToFit();
    });

  const panGesture = Gesture.Pan()
    .averageTouches(true)
    .minDistance(4)
    .onBegin(() => {
      savedOffsetX.value = offsetX.value;
      savedOffsetY.value = offsetY.value;
    })
    .onUpdate((e) => {
      if (scale.value <= 1.05) return;
      const clamped = clampOffset(
        savedOffsetX.value + e.translationX,
        savedOffsetY.value + e.translationY,
        scale.value
      );
      offsetX.value = clamped.x;
      offsetY.value = clamped.y;
    })
    .onEnd(() => {
      savedOffsetX.value = offsetX.value;
      savedOffsetY.value = offsetY.value;
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .maxDelay(300)
    .maxDuration(500)
    .onEnd((e) => {
      if (scale.value > 1.5) {
        scale.value = withTiming(1, ANIM);
        offsetX.value = withTiming(0, ANIM);
        offsetY.value = withTiming(0, ANIM);
        savedScale.value = 1;
        savedOffsetX.value = 0;
        savedOffsetY.value = 0;
      } else {
        const newScale = 3;
        const fx = e.x - W / 2;
        const fy = e.y - H / 2;
        const clamped = clampOffset(-fx * (newScale - 1), -fy * (newScale - 1), newScale);
        scale.value = withTiming(newScale, ANIM);
        offsetX.value = withTiming(clamped.x, ANIM);
        offsetY.value = withTiming(clamped.y, ANIM);
        savedScale.value = newScale;
        savedOffsetX.value = clamped.x;
        savedOffsetY.value = clamped.y;
      }
    });

  const gesture = Gesture.Race(doubleTap, Gesture.Simultaneous(pinchGesture, panGesture));

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: offsetX.value },
      { translateY: offsetY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.Image
        source={source}
        style={[{ width: W, height: H }, animStyle]}
        resizeMode="contain"
      />
    </GestureDetector>
  );
}
// ────────────────────────────────────────────────────────────────────────────

export default function VenueScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { width } = Dimensions.get("window");
  const [lightbox, setLightbox] = useState<null | (typeof FLOOR_PLANS)[0]>(null);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Nav header */}
      <View
        style={[
          styles.navHeader,
          {
            paddingTop: insets.top + 12,
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </Pressable>
        <Text style={[styles.navTitle, { color: colors.foreground }]}>
          Venue & Hotel
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={[
          styles.container,
          { paddingTop: 16, paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Venue card */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.venueHeader}>
            <View style={[styles.iconBubble, { backgroundColor: colors.primary + "18" }]}>
              <Ionicons name="business-outline" size={24} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.venueName, { color: colors.foreground }]}>
                {VENUE.name}
              </Text>
              <Text style={[styles.venueAddress, { color: colors.mutedForeground }]}>
                {VENUE.address}
              </Text>
              <Text style={[styles.venueAddress, { color: colors.mutedForeground }]}>
                {VENUE.city}
              </Text>
            </View>
          </View>
          <Pressable
            onPress={() => Linking.openURL(VENUE.mapsUrl)}
            style={({ pressed }) => [
              styles.mapButton,
              { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Ionicons name="map-outline" size={16} color="#fff" />
            <Text style={styles.mapButtonText}>Open in Maps</Text>
          </Pressable>
        </View>

        {/* Parking */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SectionHeader icon="car-outline" title="Parking & Transit" colors={colors} />
          <Text style={[styles.bodyText, { color: colors.foreground }]}>
            {VENUE.parkingInfo}
          </Text>
        </View>

        {/* WiFi */}
        <Pressable
          onPress={() =>
            Alert.alert(
              "WiFi Info",
              `Network: ${VENUE.wifiNetwork}\nPassword: ${VENUE.wifiPassword}`
            )
          }
          style={({ pressed }) => [
            styles.card,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <SectionHeader icon="wifi-outline" title="WiFi" colors={colors} />
          <View style={styles.wifiRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.wifiLabel, { color: colors.mutedForeground }]}>Network</Text>
              <Text style={[styles.wifiValue, { color: colors.foreground }]}>{VENUE.wifiNetwork}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.wifiLabel, { color: colors.mutedForeground }]}>Password</Text>
              <Text style={[styles.wifiValue, { color: colors.foreground }]}>{VENUE.wifiPassword}</Text>
            </View>
            <Ionicons name="copy-outline" size={18} color={colors.mutedForeground} />
          </View>
        </Pressable>

        {/* Rooms */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SectionHeader icon="layers-outline" title="Rooms" colors={colors} />
          {VENUE.rooms.map((room, i) => {
            const roomColor = getRoomColor(room.name);
            return (
              <View
                key={room.id}
                style={[
                  styles.roomRow,
                  i < VENUE.rooms.length - 1 && {
                    borderBottomWidth: StyleSheet.hairlineWidth,
                    borderBottomColor: colors.border,
                  },
                ]}
              >
                {/* Color bar */}
                <View style={[styles.roomColorBar, { backgroundColor: roomColor }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.roomName, { color: roomColor, fontWeight: "700" }]}>
                    {room.name}
                  </Text>
                  <Text style={[styles.roomFloor, { color: colors.mutedForeground }]}>
                    {room.floor} · {room.capacity} seats
                  </Text>
                  <Text style={[styles.roomFeatures, { color: colors.mutedForeground }]}>
                    {room.features.join(" · ")}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Floor Plans */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SectionHeader icon="map-outline" title="Floor Plans" colors={colors} />
          <Text style={[styles.floorPlanHint, { color: colors.mutedForeground }]}>
            Tap to open · Pinch to zoom · Double-tap to reset
          </Text>
          {FLOOR_PLANS.map((plan) => (
            <Pressable
              key={plan.id}
              onPress={() => setLightbox(plan)}
              style={({ pressed }) => [
                styles.floorPlanCard,
                { borderColor: colors.border, opacity: pressed ? 0.88 : 1 },
              ]}
            >
              <Image
                source={plan.source}
                style={[styles.floorPlanThumb, { width: width - 64 }]}
                resizeMode="contain"
              />
              <View style={[styles.floorPlanLabel, { backgroundColor: colors.background }]}>
                <Text style={[styles.floorPlanTitle, { color: colors.foreground }]}>
                  {plan.label}
                </Text>
                {/* Room color legend */}
                <View style={styles.roomLegend}>
                  {plan.rooms.map((roomName) => {
                    const rc = getRoomColor(roomName);
                    return (
                      <View
                        key={roomName}
                        style={[styles.legendChip, { backgroundColor: rc + "20", borderColor: rc + "50" }]}
                      >
                        <View style={[styles.legendDot, { backgroundColor: rc }]} />
                        <Text style={[styles.legendLabel, { color: rc }]} numberOfLines={1}>
                          {roomName.replace(" Conference Room", "").replace(" Ballroom", "").replace(" Restaurant", "")}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {/* ── Full-screen zoomable lightbox ── */}
      <Modal
        visible={lightbox !== null}
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setLightbox(null)}
      >
        {/* GestureHandlerRootView is REQUIRED inside Modal for gestures to work */}
        <GestureHandlerRootView style={styles.lightboxRoot}>
          {lightbox && <ZoomableImage source={lightbox.source} />}

          {/* Overlay controls */}
          <View style={[styles.lightboxHeader, { paddingTop: insets.top + 8 }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.lightboxTitle}>{lightbox?.label}</Text>
              <Text style={styles.lightboxHint}>Pinch to zoom · Double-tap to reset</Text>
            </View>
            <Pressable
              onPress={() => setLightbox(null)}
              hitSlop={16}
              style={styles.closeBtn}
            >
              <Ionicons name="close" size={22} color="#fff" />
            </Pressable>
          </View>
        </GestureHandlerRootView>
      </Modal>
    </View>
  );
}

function SectionHeader({
  icon,
  title,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  colors: any;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Ionicons name={icon} size={18} color={colors.primary} />
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  navHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 40, alignItems: "flex-start" },
  navTitle: { flex: 1, fontSize: 18, fontWeight: "700", textAlign: "center" },
  container: { paddingHorizontal: 16, gap: 14 },
  card: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
  venueHeader: { flexDirection: "row", gap: 14, alignItems: "flex-start" },
  iconBubble: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  venueName: { fontSize: 17, fontWeight: "700" },
  venueAddress: { fontSize: 13, marginTop: 2 },
  mapButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    paddingVertical: 12,
  },
  mapButtonText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionTitle: { fontSize: 16, fontWeight: "700" },
  bodyText: { fontSize: 14, lineHeight: 22 },
  wifiRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  wifiLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  wifiValue: { fontSize: 15, fontWeight: "600" },
  roomRow: { paddingVertical: 12, gap: 4, flexDirection: "row", alignItems: "flex-start" },
  roomColorBar: { width: 4, borderRadius: 2, alignSelf: "stretch", marginRight: 10, minHeight: 40 },
  roomName: { fontSize: 14, fontWeight: "600" },
  roomFloor: { fontSize: 12, marginTop: 2 },
  roomFeatures: { fontSize: 11, marginTop: 2 },
  roomLegend: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 },
  legendChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  legendDot: { width: 7, height: 7, borderRadius: 4 },
  legendLabel: { fontSize: 11, fontWeight: "600" },
  floorPlanHint: { fontSize: 12, marginTop: -4 },
  floorPlanCard: { borderRadius: 12, borderWidth: 1, overflow: "hidden" },
  floorPlanThumb: { height: 200, backgroundColor: "#f5f5f5" },
  floorPlanLabel: { paddingHorizontal: 12, paddingVertical: 10, gap: 2 },
  floorPlanTitle: { fontSize: 14, fontWeight: "700" },
  floorPlanSub: { fontSize: 11, lineHeight: 16 },
  // Lightbox
  lightboxRoot: {
    flex: 1,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },
  lightboxHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 16,
    paddingBottom: 14,
    gap: 12,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  lightboxTitle: { color: "#fff", fontSize: 16, fontWeight: "700" },
  lightboxHint: { color: "rgba(255,255,255,0.5)", fontSize: 11, marginTop: 2 },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
});
