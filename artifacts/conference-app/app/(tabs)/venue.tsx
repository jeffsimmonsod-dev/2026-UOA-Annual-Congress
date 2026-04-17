import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import React from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { VENUE } from "@/services/data";

export default function VenueScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const openMap = () => {
    Linking.openURL(VENUE.mapsUrl);
  };

  const copyWifi = () => {
    Alert.alert(
      "WiFi Info",
      `Network: ${VENUE.wifiNetwork}\nPassword: ${VENUE.wifiPassword}`
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.navHeader, { paddingTop: insets.top + 12, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </Pressable>
        <Text style={[styles.navTitle, { color: colors.foreground }]}>Venue & Hotel</Text>
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
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.venueHeader}>
          <View
            style={[styles.iconBubble, { backgroundColor: colors.primary + "18" }]}
          >
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
          onPress={openMap}
          style={({ pressed }) => [
            styles.mapButton,
            { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Ionicons name="map-outline" size={16} color="#fff" />
          <Text style={styles.mapButtonText}>Open in Maps</Text>
        </Pressable>
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <SectionHeader icon="car-outline" title="Parking & Transit" colors={colors} />
        <Text style={[styles.bodyText, { color: colors.foreground }]}>
          {VENUE.parkingInfo}
        </Text>
      </View>

      <Pressable
        onPress={copyWifi}
        style={({ pressed }) => [
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
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
    </ScrollView>
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
  venueName: {
    fontSize: 17,
    fontWeight: "700",
  },
  venueAddress: {
    fontSize: 13,
    marginTop: 2,
  },
  mapButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    paddingVertical: 12,
  },
  mapButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  bodyText: {
    fontSize: 14,
    lineHeight: 22,
  },
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
  wifiValue: {
    fontSize: 15,
    fontWeight: "600",
  },
  roomRow: {
    paddingVertical: 12,
    gap: 4,
  },
  roomName: {
    fontSize: 14,
    fontWeight: "600",
  },
  roomFloor: {
    fontSize: 12,
    marginTop: 2,
  },
  roomFeatures: {
    fontSize: 11,
    marginTop: 2,
  },
});
