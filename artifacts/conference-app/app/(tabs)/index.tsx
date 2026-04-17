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
import { useColors } from "@/hooks/useColors";
import { useSchedule } from "@/context/ScheduleContext";
import { CONFERENCE, SESSIONS, PARA_SESSIONS, SPONSORS, UPDATES } from "@/services/data";
import type { Session } from "@/types";

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

const TIER_COLORS: Record<string, { bg: string; text: string }> = {
  platinum: { bg: "#e8e4f8", text: "#5b21b6" },
  gold:     { bg: "#fef3c7", text: "#92400e" },
  silver:   { bg: "#f1f5f9", text: "#475569" },
  bronze:   { bg: "#fef3c7", text: "#78350f" },
};

const DAY_ORDER = ["Thu, June 4", "Fri, June 5", "Sat, June 6", "Sun, June 7"];

function parseMinutes(t: string): number {
  const parts = t.trim().split(" ");
  const [h, m] = parts[0].split(":").map(Number);
  const period = parts[1]?.toUpperCase();
  let hours = h;
  if (period === "PM" && h !== 12) hours += 12;
  if (period === "AM" && h === 12) hours = 0;
  return hours * 60 + (m || 0);
}

function sortSessions(sessions: Session[]): Session[] {
  return [...sessions].sort((a, b) => {
    const dayDiff = DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day);
    if (dayDiff !== 0) return dayDiff;
    return parseMinutes(a.startTime) - parseMinutes(b.startTime);
  });
}

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { savedIds } = useSchedule();
  const isWeb = Platform.OS === "web";

  const allSessions = [...SESSIONS, ...PARA_SESSIONS];
  const savedSessions = sortSessions(allSessions.filter((s) => savedIds.has(s.id)));
  const nextSession: Session | null = savedSessions[0] ?? null;
  const trackColor = nextSession ? (TRACK_COLORS[nextSession.track] ?? colors.primary) : colors.primary;
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
        My Next Session
      </Text>

      {nextSession ? (
        <Pressable
          onPress={() =>
            router.push({ pathname: "/session/[id]", params: { id: nextSession.id } })
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
              {nextSession.track}
            </Text>
          </View>
          <Text style={[styles.featuredTitle, { color: colors.foreground }]}>
            {nextSession.title}
          </Text>
          <View style={styles.featuredMeta}>
            <Ionicons name="time-outline" size={13} color={colors.mutedForeground} />
            <Text style={[styles.featuredMetaText, { color: colors.mutedForeground }]}>
              {nextSession.startTime} – {nextSession.endTime} · {nextSession.room}
            </Text>
          </View>
          <View style={styles.featuredMeta}>
            <Ionicons name="calendar-outline" size={13} color={colors.mutedForeground} />
            <Text style={[styles.featuredMetaText, { color: colors.mutedForeground }]}>
              {nextSession.day}
            </Text>
          </View>
          {nextSession.copeId && (
            <View style={styles.featuredMeta}>
              <Ionicons name="school-outline" size={13} color={colors.mutedForeground} />
              <Text style={[styles.featuredMetaText, { color: colors.mutedForeground }]}>
                COPE: {nextSession.copeId}
              </Text>
            </View>
          )}
        </Pressable>
      ) : (
        <Pressable
          onPress={() => router.push("/(tabs)/schedule")}
          style={({ pressed }) => [
            styles.emptySessionCard,
            { backgroundColor: colors.card, borderColor: colors.border },
            pressed && { opacity: 0.85 },
          ]}
        >
          <Ionicons name="bookmark-outline" size={32} color={colors.primary} />
          <Text style={[styles.emptySessionTitle, { color: colors.foreground }]}>
            Build Your Personal Schedule
          </Text>
          <Text style={[styles.emptySessionBody, { color: colors.mutedForeground }]}>
            Tap the bookmark icon on any session in the Schedule or Para tab to save it here.
          </Text>
          <View style={[styles.emptySessionCta, { backgroundColor: colors.primary + "15" }]}>
            <Text style={[styles.emptySessionCtaText, { color: colors.primary }]}>
              Browse Sessions →
            </Text>
          </View>
        </Pressable>
      )}

      <Pressable
        onPress={() => router.push("/exhibit-hall?scan=true" as any)}
        style={({ pressed }) => [
          styles.scanQrBtn,
          { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
        ]}
      >
        <Ionicons name="qr-code-outline" size={22} color="#fff" />
        <Text style={styles.scanQrBtnText}>Scan Booth QR Code</Text>
        <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.7)" />
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
            <View style={[styles.tierBadge, { backgroundColor: TIER_COLORS[sponsor.tier]?.bg ?? "#f3f4f6" }]}>
              <Text style={[styles.tierText, { color: TIER_COLORS[sponsor.tier]?.text ?? "#6b7280" }]}>
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
  scanQrBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 14,
    marginTop: 4,
  },
  scanQrBtnText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
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
  emptySessionCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: "dashed",
    padding: 24,
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  emptySessionTitle: {
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  emptySessionBody: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
  },
  emptySessionCta: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 4,
  },
  emptySessionCtaText: {
    fontSize: 13,
    fontWeight: "700",
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
