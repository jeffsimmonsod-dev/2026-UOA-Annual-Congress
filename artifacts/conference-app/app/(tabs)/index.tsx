import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useTabletLayout } from "@/hooks/useTabletLayout";
import { useSchedule } from "@/context/ScheduleContext";
import { CONFERENCE, SESSIONS, PARA_SESSIONS, SPONSORS, UPDATES } from "@/services/data";
import type { Session, Sponsor } from "@/types";

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const TRACK_COLORS: Record<string, string> = {
  "Retinal Disease": "#ef4444",
  "Neuro-Optometry": "#8b5cf6",
  Glaucoma: "#10b981",
  Pharmacology: "#d946ef",
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
  CPC: "#0ea5e9",
  CPO: "#0ea5e9",
  "ABO/CPO": "#0ea5e9",
  "Meal / Social": "#f59e0b",
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

const QUICK_TILES = [
  {
    label: "Exhibit Hall",
    subtitle: "Booth passport & raffle",
    icon: "storefront-outline" as const,
    color: "#4f46e5",
    bg: "rgba(79,70,229,0.10)",
    route: "/exhibit-hall",
  },
  {
    label: "My Notes",
    subtitle: "Saved sessions & notes",
    icon: "bookmark-outline" as const,
    color: "#10b981",
    bg: "rgba(16,185,129,0.10)",
    route: "/(tabs)/my-schedule",
  },
  {
    label: "Venue & Hotel",
    subtitle: "Grand Hyatt Deer Valley",
    icon: "business-outline" as const,
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.10)",
    route: "/(tabs)/venue",
  },
  {
    label: "FAQ",
    subtitle: "Frequently asked questions",
    icon: "help-circle-outline" as const,
    color: "#0ea5e9",
    bg: "rgba(14,165,233,0.10)",
    route: "/faq",
  },
];

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { contentStyle } = useTabletLayout();
  const { savedIds } = useSchedule();

  const allSessions = [...SESSIONS, ...PARA_SESSIONS];
  const savedSessions = sortSessions(allSessions.filter((s) => savedIds.has(s.id)));
  const nextSession: Session | null = savedSessions[0] ?? null;
  const trackColor = nextSession ? (TRACK_COLORS[nextSession.track] ?? colors.primary) : colors.primary;
  const [selectedSponsor, setSelectedSponsor] = useState<Sponsor | null>(null);
  const logoTapCountRef = useRef(0);
  const logoTapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const LOGO_TAPS_REQUIRED = 7;

  const handleLogoTap = () => {
    if (logoTapTimerRef.current) clearTimeout(logoTapTimerRef.current);
    logoTapCountRef.current += 1;
    if (logoTapCountRef.current >= LOGO_TAPS_REQUIRED) {
      logoTapCountRef.current = 0;
      router.push("/admin");
      return;
    }
    logoTapTimerRef.current = setTimeout(() => {
      logoTapCountRef.current = 0;
    }, 3000);
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
          paddingTop: insets.top + 8,
          paddingBottom: insets.bottom + 100,
        },
        contentStyle,
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Compact Hero ── */}
      <Pressable onPress={handleLogoTap} hitSlop={8}>
        <View style={styles.heroRow}>
          <View style={[styles.logoSmallWrap, { backgroundColor: "#ffffff", shadowColor: colors.foreground }]}>
            <Image
              source={require("../../assets/images/uoa-logo.png")}
              style={styles.logoSmall}
              resizeMode="contain"
            />
          </View>
          <View style={styles.heroText}>
            <Text style={[styles.heroBadge, { color: colors.primary }]}>
              2026 ANNUAL CONGRESS
            </Text>
            <Text style={[styles.heroTitle, { color: colors.foreground }]}>
              UOA Congress
            </Text>
            <View style={styles.heroMeta}>
              <Ionicons name="location-outline" size={11} color={colors.mutedForeground} />
              <Text style={[styles.heroMetaText, { color: colors.mutedForeground }]}>
                {CONFERENCE.dates} · {CONFERENCE.location}
              </Text>
            </View>
          </View>
        </View>
      </Pressable>

      {/* ── Announcement ── */}
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
            <Ionicons name="megaphone-outline" size={13} color={announcementColor} />
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
          <Text style={[styles.announcementBody, { color: colors.mutedForeground }]} numberOfLines={2}>
            {latestUpdate.body}
          </Text>
          <Text style={[styles.announcementSeeAll, { color: announcementColor }]}>
            View all announcements →
          </Text>
        </Pressable>
      )}

      {/* ── My Next Session ── */}
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
          <Ionicons name="bookmark-outline" size={28} color={colors.primary} />
          <Text style={[styles.emptySessionTitle, { color: colors.foreground }]}>
            Build Your Personal Schedule
          </Text>
          <Text style={[styles.emptySessionBody, { color: colors.mutedForeground }]}>
            Tap the bookmark icon on any session to save it here.
          </Text>
          <View style={[styles.emptySessionCta, { backgroundColor: colors.primary + "15" }]}>
            <Text style={[styles.emptySessionCtaText, { color: colors.primary }]}>
              Browse Sessions →
            </Text>
          </View>
        </Pressable>
      )}

      {/* ── Scan QR ── */}
      <Pressable
        onPress={() => router.push("/exhibit-hall?scan=true" as any)}
        style={({ pressed }) => [
          styles.scanQrBtn,
          { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
        ]}
      >
        <Ionicons name="qr-code-outline" size={20} color="#fff" />
        <Text style={styles.scanQrBtnText}>Scan Booth QR Code</Text>
        <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.7)" />
      </Pressable>

      {/* ── Quick Access ── */}
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
        Quick Access
      </Text>
      <View style={styles.tilesGrid}>
        {QUICK_TILES.map((tile) => (
          <Pressable
            key={tile.label}
            onPress={() => router.push(tile.route as any)}
            style={({ pressed }) => [
              styles.tile,
              { backgroundColor: colors.card, borderColor: colors.border },
              pressed && { opacity: 0.80 },
            ]}
          >
            <View style={[styles.tileIconWrap, { backgroundColor: tile.bg }]}>
              <Ionicons name={tile.icon} size={22} color={tile.color} />
            </View>
            <Text style={[styles.tileLabel, { color: colors.foreground }]}>
              {tile.label}
            </Text>
            <Text style={[styles.tileSubtitle, { color: colors.mutedForeground }]} numberOfLines={2}>
              {tile.subtitle}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* ── Sponsors ── */}
      <View style={styles.sectionRow}>
        <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 0, marginBottom: 0 }]}>
          Our Sponsors
        </Text>
        <Pressable onPress={() => router.push("/sponsors")}>
          <Text style={[styles.seeAll, { color: colors.primary }]}>See all →</Text>
        </Pressable>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.sponsorsScroll}
      >
        {SPONSORS.map((sponsor) => (
          <Pressable
            key={sponsor.id}
            onPress={() => setSelectedSponsor(sponsor)}
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

      {/* Sponsor Detail Modal */}
      <Modal
        visible={!!selectedSponsor}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedSponsor(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setSelectedSponsor(null)} />
        {selectedSponsor && (
          <View style={[styles.sponsorSheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.sheetHandle} />

            <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
              <View style={[styles.sheetLogoWrap, { backgroundColor: "#ffffff" }]}>
                <Image source={{ uri: selectedSponsor.logo }} style={styles.sheetLogo} resizeMode="contain" />
              </View>
              <View style={styles.sheetHeader}>
                <Text style={[styles.sheetName, { color: colors.foreground }]}>{selectedSponsor.name}</Text>
                <View style={[styles.tierBadge, { backgroundColor: TIER_COLORS[selectedSponsor.tier]?.bg ?? "#f3f4f6" }]}>
                  <Text style={[styles.tierText, { color: TIER_COLORS[selectedSponsor.tier]?.text ?? "#6b7280" }]}>
                    {selectedSponsor.tier.toUpperCase()}
                  </Text>
                </View>
              </View>

              <Text style={[styles.sheetDesc, { color: colors.mutedForeground }]}>{selectedSponsor.description}</Text>

              {selectedSponsor.reps && selectedSponsor.reps.length > 0 && (
                <View style={styles.repsSection}>
                  <Text style={[styles.repsSectionTitle, { color: colors.foreground }]}>
                    <Ionicons name="people-outline" size={14} /> Contact Reps
                  </Text>
                  {selectedSponsor.reps.map((rep, i) => (
                    <View key={i} style={[styles.repCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                      <Text style={[styles.repName, { color: colors.foreground }]}>{rep.name}</Text>
                      {rep.title ? (
                        <Text style={[styles.repTitle, { color: colors.mutedForeground }]}>{rep.title}</Text>
                      ) : null}
                      <View style={styles.repActions}>
                        {rep.phone ? (
                          <Pressable
                            onPress={() => Linking.openURL(`tel:${rep.phone!.replace(/\./g, "")}`)}
                            style={({ pressed }) => [styles.repBtn, { backgroundColor: colors.accent, opacity: pressed ? 0.7 : 1 }]}
                          >
                            <Ionicons name="call-outline" size={14} color={colors.primary} />
                            <Text style={[styles.repBtnText, { color: colors.primary }]}>{rep.phone}</Text>
                          </Pressable>
                        ) : null}
                        {rep.email ? (
                          <Pressable
                            onPress={() => Linking.openURL(`mailto:${rep.email}`)}
                            style={({ pressed }) => [styles.repBtn, { backgroundColor: colors.accent, opacity: pressed ? 0.7 : 1 }]}
                          >
                            <Ionicons name="mail-outline" size={14} color={colors.primary} />
                            <Text style={[styles.repBtnText, { color: colors.primary }]} numberOfLines={1}>{rep.email}</Text>
                          </Pressable>
                        ) : null}
                      </View>
                    </View>
                  ))}
                </View>
              )}

              <Pressable
                onPress={() => { Linking.openURL(selectedSponsor.website); setSelectedSponsor(null); }}
                style={({ pressed }) => [styles.websiteBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
              >
                <Ionicons name="globe-outline" size={16} color="#fff" />
                <Text style={styles.websiteBtnText}>Visit Website</Text>
              </Pressable>
            </ScrollView>
          </View>
        )}
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    gap: 8,
  },

  /* ── Compact Hero ── */
  heroRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 4,
  },
  logoSmallWrap: {
    width: 90,
    height: 90,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    flexShrink: 0,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  logoSmall: {
    width: 82,
    height: 82,
  },
  heroText: {
    flex: 1,
    gap: 2,
  },
  heroBadge: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.3,
    lineHeight: 27,
  },
  heroMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  heroMetaText: {
    fontSize: 11,
    flex: 1,
  },

  /* ── Announcement ── */
  announcementCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 13,
    gap: 6,
  },
  announcementHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  announcementLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
    flex: 1,
  },
  announcementTime: {
    fontSize: 10,
  },
  announcementTitle: {
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 19,
  },
  announcementBody: {
    fontSize: 12,
    lineHeight: 18,
  },
  announcementSeeAll: {
    fontSize: 11,
    fontWeight: "600",
  },

  /* ── Section titles ── */
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    marginTop: 6,
    marginBottom: 4,
  },
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
    marginBottom: 4,
  },
  seeAll: {
    fontSize: 13,
    fontWeight: "600",
  },

  /* ── Next Session ── */
  featuredCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderLeftWidth: 4,
    padding: 14,
    gap: 8,
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
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 22,
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
    padding: 20,
    alignItems: "center",
    gap: 8,
  },
  emptySessionTitle: {
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
  },
  emptySessionBody: {
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
  },
  emptySessionCta: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    marginTop: 2,
  },
  emptySessionCtaText: {
    fontSize: 13,
    fontWeight: "700",
  },

  /* ── Scan QR ── */
  scanQrBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  scanQrBtnText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },

  /* ── Quick Access Tiles ── */
  tilesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  tile: {
    width: "47.5%",
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  tileIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  tileLabel: {
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 18,
  },
  tileSubtitle: {
    fontSize: 11,
    lineHeight: 15,
  },

  /* ── Sponsors ── */
  sponsorsScroll: {
    paddingRight: 16,
    gap: 10,
    paddingBottom: 8,
  },
  sponsorCard: {
    width: 130,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    alignItems: "center",
    gap: 8,
  },
  sponsorLogoWrap: {
    width: 64,
    height: 64,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  sponsorLogo: {
    width: 54,
    height: 54,
  },
  sponsorName: {
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 15,
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

  /* ── Sponsor Modal ── */
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sponsorSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    maxHeight: "80%",
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#d1d5db",
    alignSelf: "center",
    marginBottom: 16,
  },
  sheetLogoWrap: {
    width: 120,
    height: 80,
    borderRadius: 14,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    overflow: "hidden",
  },
  sheetLogo: {
    width: 108,
    height: 68,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sheetName: {
    fontSize: 18,
    fontWeight: "800",
    flex: 1,
    marginRight: 10,
  },
  sheetDesc: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 18,
  },
  repsSection: {
    gap: 10,
    marginBottom: 18,
  },
  repsSectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  repCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 4,
  },
  repName: {
    fontSize: 14,
    fontWeight: "700",
  },
  repTitle: {
    fontSize: 12,
    marginBottom: 6,
  },
  repActions: {
    gap: 6,
  },
  repBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
  },
  repBtnText: {
    fontSize: 13,
    fontWeight: "500",
    flex: 1,
  },
  websiteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    marginBottom: 8,
  },
  websiteBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
});
