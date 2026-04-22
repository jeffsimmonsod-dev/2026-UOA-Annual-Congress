import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { VENUE } from "@/services/data";

const FLOOR_PLANS = [
  {
    id: "lake",
    label: "Lake Level",
    subtitle: "Deer Creek Ballroom · Jordanelle Ballroom · Strawberry Conference Room",
    source: require("@/assets/images/floorplan-lake-level.png"),
  },
  {
    id: "mid",
    label: "Mid Mountain Level",
    subtitle: "Empire Conference Room · Big Dutch · Lady Morgan · Park Peak",
    source: require("@/assets/images/floorplan-mid-mountain.png"),
  },
];

export default function VenueScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [lightbox, setLightbox] = useState<null | (typeof FLOOR_PLANS)[0]>(null);

  const imgW = width;
  const imgH = height - insets.top - insets.bottom - 80;

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
              <Text style={[styles.wifiLabel, { color: colors.mutedForeground }]}>
                Network
              </Text>
              <Text style={[styles.wifiValue, { color: colors.foreground }]}>
                {VENUE.wifiNetwork}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.wifiLabel, { color: colors.mutedForeground }]}>
                Password
              </Text>
              <Text style={[styles.wifiValue, { color: colors.foreground }]}>
                {VENUE.wifiPassword}
              </Text>
            </View>
            <Ionicons name="copy-outline" size={18} color={colors.mutedForeground} />
          </View>
        </Pressable>

        {/* Rooms */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SectionHeader icon="layers-outline" title="Rooms" colors={colors} />
          {VENUE.rooms.map((room, i) => (
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
              <View style={{ flex: 1 }}>
                <Text style={[styles.roomName, { color: colors.foreground }]}>
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
          ))}
        </View>

        {/* Floor Plans */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SectionHeader icon="map-outline" title="Floor Plans" colors={colors} />
          <Text style={[styles.floorPlanHint, { color: colors.mutedForeground }]}>
            Tap to open · Pinch to zoom
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
                <Text style={[styles.floorPlanSub, { color: colors.mutedForeground }]}>
                  {plan.subtitle}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {/* Full-screen zoomable lightbox */}
      <Modal
        visible={lightbox !== null}
        transparent={false}
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setLightbox(null)}
      >
        <View style={[styles.lightboxBackdrop, { paddingTop: insets.top }]}>
          {/* Header */}
          <View style={styles.lightboxHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.lightboxTitle}>{lightbox?.label}</Text>
              <Text style={styles.lightboxHint}>Pinch to zoom · Drag to pan</Text>
            </View>
            <Pressable
              onPress={() => setLightbox(null)}
              hitSlop={16}
              style={styles.closeBtn}
            >
              <Ionicons name="close" size={22} color="#fff" />
            </Pressable>
          </View>

          {/* Zoomable via ScrollView — native pinch on iOS & Android */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={[
              styles.lightboxImageArea,
              { width: imgW, height: imgH },
            ]}
            maximumZoomScale={6}
            minimumZoomScale={1}
            centerContent
            bouncesZoom
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
          >
            {lightbox && (
              <Image
                source={lightbox.source}
                style={{ width: imgW, height: imgH }}
                resizeMode="contain"
              />
            )}
          </ScrollView>
        </View>
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
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
        {title}
      </Text>
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
  navTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  container: {
    paddingHorizontal: 16,
    gap: 14,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  venueHeader: {
    flexDirection: "row",
    gap: 14,
    alignItems: "flex-start",
  },
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
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: { fontSize: 16, fontWeight: "700" },
  bodyText: { fontSize: 14, lineHeight: 22 },
  wifiRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  wifiLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  wifiValue: { fontSize: 15, fontWeight: "600" },
  roomRow: { paddingVertical: 12, gap: 4 },
  roomName: { fontSize: 14, fontWeight: "600" },
  roomFloor: { fontSize: 12, marginTop: 2 },
  roomFeatures: { fontSize: 11, marginTop: 2 },
  floorPlanHint: { fontSize: 12, marginTop: -4 },
  floorPlanCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  floorPlanThumb: {
    height: 200,
    backgroundColor: "#f5f5f5",
  },
  floorPlanLabel: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 2,
  },
  floorPlanTitle: { fontSize: 14, fontWeight: "700" },
  floorPlanSub: { fontSize: 11, lineHeight: 16 },
  lightboxBackdrop: {
    flex: 1,
    backgroundColor: "#000",
  },
  lightboxHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  lightboxTitle: { color: "#fff", fontSize: 16, fontWeight: "700" },
  lightboxHint: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 11,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  lightboxImageArea: {
    alignItems: "center",
    justifyContent: "center",
  },
});
