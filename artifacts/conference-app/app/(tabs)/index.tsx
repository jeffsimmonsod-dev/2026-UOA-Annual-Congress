import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Image,
  Linking,
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
import { CONFERENCE, SESSIONS, SPONSORS, UPDATES } from "@/services/data";

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const TRACK_COLORS: Record<string, string> = {
  "Retinal Disease": "#ef4444",
  "Neuro-Optometry": "#8b5cf6",
  Glaucoma: "#10b981",
  Pharmacology: "#f59e0b",
  "Practice Management": "#3b82f6",
  "Pediatrics & BV": "#ec4899",
  "Topical Diagnosis": "#14b8a6",
  "Ocular Disease": "#6366f1",
  "Systemic Disease": "#f97316",
  "ABO/CPC": "#0ea5e9",
  General: "#6b7280",
  Optical: "#a855f7",
  "Clinical Knowledge": "#84cc16",
  "Contact Lenses": "#06b6d4",
};

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const upcomingSession = SESSIONS[0];
  const trackColor = TRACK_COLORS[upcomingSession.track] ?? colors.primary;
  const isWeb = Platform.OS === "web";
  const [logoTapCount, setLogoTapCount] = useState(0);
  const logoTapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const LOGO_TAPS_REQUIRED = 7;

  const handleLogoTap = () => {
    setLogoTapCount((prev) => {
      const next = prev + 1;
      if (logoTapTimerRef.current) clearTimeout(logoTapTimerRef.current);
      if (next >= LOGO_TAPS_REQUIRED) {
        setLogoTapCount(0);
        router.push("/admin");
        return 0;
      }
      logoTapTimerRef.current = setTimeout(() => setLogoTapCount(0), 3000);
      return next;
    });
  };

  const latestUpdate = [...UPDATES].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )[0];
  const announcementColor =
    latestUpdate?.type === "alert" ? "#ef4444" :
    latestUpdate?.type === "announcement" ? colors.primary : "#f59e0b";
  const announcementBg = announcementColor + "10";
  const announcementBorder = announcementColor + "35";

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.container,
        {
          paddingTop: isWeb ? insets.top + 20 : 16,
          paddingBottom: isWeb ? insets.bottom + 80 : 100,
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.heroSection}>
        <Pressable onPress={handleLogoTap} hitSlop={8} style={styles.logoWrapper}>
          <Image
            source={require("../../assets/images/uoa-logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </Pressable>
        <View style={[styles.badge, { backgroundColor: colors.accent }]}>
          <Ionicons name="eye-outline" size={13} color={colors.primary} />
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

      {latestUpdate && (
        <Pressable
          onPress={() => router.push("/updates")}
          style={({ pressed }) => [
            styles.announcementCard,
            { backgroundColor: announcementBg, borderColor: announcementBorder },
            pressed && { opacity: 0.85 },
          ]}
        >
          <View style={styles.announcementHeader}>
            <Ionicons name="megaphone-outline" size={15} color={announcementColor} />
            <Text style={[styles.announcementLabel, { color: announcementColor }]}>
              {latestUpdate.type === "alert" ? "ALERT" : "ANNOUNCEMENT"}
            </Text>
            <Text style={[styles.announcementTime, { color: colors.mutedForeground }]}>
              {formatDate(latestUpdate.timestamp)}
            </Text>
          </View>
          <Text style={[styles.announcementTitle, { color: colors.foreground }]}>
            {latestUpdate.title}
          </Text>
          <Text style={[styles.announcementBody, { color: colors.mutedForeground }]} numberOfLines={3}>
            {latestUpdate.body}
          </Text>
          <Text style={[styles.announcementSeeAll, { color: announcementColor }]}>
            View all announcements →
          </Text>
        </Pressable>
      )}

      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
        Quick Access
      </Text>
      <View style={styles.quickActions}>
        <QuickActionButton
          label="Dr. Schedule"
          icon="calendar-outline"
          color={colors.primary}
          onPress={() => router.push("/(tabs)/schedule")}
        />
        <QuickActionButton
          label="Para"
          icon="people-outline"
          color="#8b5cf6"
          onPress={() => router.push("/(tabs)/para")}
        />
        <QuickActionButton
          label="My Schedule"
          icon="bookmark-outline"
          color="#10b981"
          onPress={() => router.push("/(tabs)/my-schedule")}
        />
        <QuickActionButton
          label="Speakers"
          imageSource={require("../../assets/images/uoa-logo.png")}
          color="#f59e0b"
          onPress={() => router.push("/(tabs)/speakers")}
        />
      </View>

      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
        First Session
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
            {upcomingSession.startTime} – {upcomingSession.endTime} · {upcomingSession.room}
          </Text>
        </View>
        {upcomingSession.copeId && (
          <View style={styles.featuredMeta}>
            <Ionicons name="school-outline" size={13} color={colors.mutedForeground} />
            <Text style={[styles.featuredMetaText, { color: colors.mutedForeground }]}>
              COPE: {upcomingSession.copeId}
            </Text>
          </View>
        )}
      </Pressable>

      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
        Our Sponsors
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.sponsorsScroll}
      >
        {SPONSORS.map((sponsor) => (
          <Pressable
            key={sponsor.id}
            onPress={() => sponsor.website && Linking.openURL(sponsor.website)}
            style={({ pressed }) => [
              styles.sponsorCard,
              { backgroundColor: colors.card, borderColor: colors.border },
              pressed && { opacity: 0.85 },
            ]}
          >
            <View style={[styles.sponsorLogoWrap, { backgroundColor: colors.muted }]}>
              <Image
                source={{ uri: sponsor.logo }}
                style={styles.sponsorLogo}
                resizeMode="contain"
              />
            </View>
            <Text style={[styles.sponsorName, { color: colors.foreground }]} numberOfLines={2}>
              {sponsor.name}
            </Text>
            <View style={[styles.tierBadge, { backgroundColor: sponsor.tier === "platinum" ? "#e0d6ff" : "#fef3c7" }]}>
              <Text style={[styles.tierText, { color: sponsor.tier === "platinum" ? "#6d28d9" : "#92400e" }]}>
                {sponsor.tier.toUpperCase()}
              </Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
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
    alignItems: "center",
  },
  logoWrapper: {
    width: "100%",
  },
  logo: {
    width: "100%",
    height: 200,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  conferenceName: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
    lineHeight: 34,
    textAlign: "center",
  },
  tagline: {
    fontSize: 15,
    fontWeight: "500",
    textAlign: "center",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  locationText: {
    fontSize: 13,
  },
  announcementCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 8,
    marginBottom: 12,
  },
  announcementHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  announcementLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    flex: 1,
  },
  announcementTime: {
    fontSize: 11,
  },
  announcementTitle: {
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 20,
  },
  announcementBody: {
    fontSize: 13,
    lineHeight: 20,
  },
  announcementSeeAll: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
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
  sponsorsScroll: {
    paddingRight: 20,
    gap: 12,
    paddingBottom: 8,
  },
  sponsorCard: {
    width: 140,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    alignItems: "center",
    gap: 10,
  },
  sponsorLogoWrap: {
    width: 72,
    height: 72,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  sponsorLogo: {
    width: 60,
    height: 60,
  },
  sponsorName: {
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 16,
  },
  tierBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tierText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});
