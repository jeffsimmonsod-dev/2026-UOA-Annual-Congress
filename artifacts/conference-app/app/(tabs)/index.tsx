import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import QuickActionButton from "@/components/QuickActionButton";
import { useColors } from "@/hooks/useColors";
import { CONFERENCE, SESSIONS, SPEAKERS } from "@/services/data";

const TRACK_COLORS: Record<string, string> = {
  Architecture: "#6366f1",
  Frontend: "#ec4899",
  Backend: "#14b8a6",
  "AI & ML": "#f59e0b",
  Keynote: "#ef4444",
  DevOps: "#10b981",
  Workshops: "#8b5cf6",
  "Open Source": "#3b82f6",
  "Data & AI": "#f59e0b",
};

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const upcomingSession = SESSIONS[0];
  const trackColor = TRACK_COLORS[upcomingSession.track] ?? colors.primary;
  const isWeb = Platform.OS === "web";

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.container,
        {
          paddingTop: isWeb ? insets.top + 20 : 16,
          paddingBottom: isWeb ? insets.bottom + 20 : 32,
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.heroSection}>
        <View style={[styles.badge, { backgroundColor: colors.accent }]}>
          <Ionicons name="mic-outline" size={13} color={colors.primary} />
          <Text style={[styles.badgeText, { color: colors.primary }]}>
            {CONFERENCE.dates}
          </Text>
        </View>
        <Text style={[styles.conferenceName, { color: colors.foreground }]}>
          {CONFERENCE.name}
        </Text>
        <Text style={[styles.tagline, { color: colors.primary }]}>
          {CONFERENCE.tagline}
        </Text>
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={14} color={colors.mutedForeground} />
          <Text style={[styles.locationText, { color: colors.mutedForeground }]}>
            {CONFERENCE.location}
          </Text>
        </View>
      </View>

      <View
        style={[
          styles.welcomeCard,
          { backgroundColor: colors.primary + "12", borderColor: colors.primary + "30" },
        ]}
      >
        <Text style={[styles.welcomeTitle, { color: colors.primary }]}>
          Welcome
        </Text>
        <Text style={[styles.welcomeText, { color: colors.foreground }]}>
          {CONFERENCE.welcomeMessage}
        </Text>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
        Quick Access
      </Text>
      <View style={styles.quickActions}>
        <QuickActionButton
          label="Schedule"
          icon="calendar-outline"
          color={colors.primary}
          onPress={() => router.push("/(tabs)/schedule")}
        />
        <QuickActionButton
          label="My Schedule"
          icon="bookmark-outline"
          color="#8b5cf6"
          onPress={() => router.push("/my-schedule")}
        />
        <QuickActionButton
          label="Updates"
          icon="notifications-outline"
          color="#f59e0b"
          onPress={() => router.push("/updates")}
        />
        <QuickActionButton
          label="Venue"
          icon="map-outline"
          color="#10b981"
          onPress={() => router.push("/(tabs)/venue")}
        />
      </View>

      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
        Opening Session
      </Text>
      <Pressable
        onPress={() =>
          router.push({ pathname: "/session/[id]", params: { id: upcomingSession.id } })
        }
        style={({ pressed }) => [
          styles.featuredCard,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            borderLeftColor: trackColor,
          },
          pressed && { opacity: 0.85 },
        ]}
      >
        <View style={[styles.featuredTrackBadge, { backgroundColor: trackColor + "20" }]}>
          <Text style={[styles.featuredTrackText, { color: trackColor }]}>
            {upcomingSession.track}
          </Text>
        </View>
        <Text style={[styles.featuredTitle, { color: colors.foreground }]}>
          {upcomingSession.title}
        </Text>
        <View style={styles.featuredMeta}>
          <Ionicons name="time-outline" size={13} color={colors.mutedForeground} />
          <Text style={[styles.featuredMetaText, { color: colors.mutedForeground }]}>
            {upcomingSession.startTime} · {upcomingSession.room}
          </Text>
        </View>
      </Pressable>

      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
        Featured Speakers
      </Text>
      {SPEAKERS.slice(0, 3).map((speaker) => (
        <Pressable
          key={speaker.id}
          onPress={() =>
            router.push({ pathname: "/speaker/[id]", params: { id: speaker.id } })
          }
          style={({ pressed }) => [
            styles.speakerRow,
            { borderBottomColor: colors.border },
            pressed && { opacity: 0.75 },
          ]}
        >
          <View style={[styles.speakerAvatar, { backgroundColor: colors.accent }]}>
            <Text style={[styles.speakerInitial, { color: colors.primary }]}>
              {speaker.name[0]}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.speakerName, { color: colors.foreground }]}>
              {speaker.name}
            </Text>
            <Text style={[styles.speakerRole, { color: colors.mutedForeground }]}>
              {speaker.title} · {speaker.company}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    gap: 6,
  },
  heroSection: {
    paddingVertical: 12,
    gap: 8,
    marginBottom: 4,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  conferenceName: {
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -0.5,
    lineHeight: 38,
  },
  tagline: {
    fontSize: 15,
    fontWeight: "500",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  locationText: {
    fontSize: 13,
  },
  welcomeCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 6,
    marginBottom: 12,
  },
  welcomeTitle: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  welcomeText: {
    fontSize: 14,
    lineHeight: 22,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: 12,
    marginBottom: 10,
  },
  quickActions: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 8,
  },
  featuredCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderLeftWidth: 4,
    padding: 16,
    gap: 10,
    marginBottom: 8,
  },
  featuredTrackBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  featuredTrackText: {
    fontSize: 11,
    fontWeight: "600",
  },
  featuredTitle: {
    fontSize: 17,
    fontWeight: "700",
    lineHeight: 24,
  },
  featuredMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  featuredMetaText: {
    fontSize: 13,
  },
  speakerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  speakerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  speakerInitial: {
    fontSize: 18,
    fontWeight: "700",
  },
  speakerName: {
    fontSize: 15,
    fontWeight: "600",
  },
  speakerRole: {
    fontSize: 12,
    marginTop: 2,
  },
});
