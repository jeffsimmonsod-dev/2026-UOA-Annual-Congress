import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Image,
  Modal,
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
import { getSpeakerImage } from "@/services/speakerImages";
import { CONFERENCE, SESSIONS, SPEAKERS, UPDATES } from "@/services/data";

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
  const [enlargedPhoto, setEnlargedPhoto] = useState<{ src: any; name: string } | null>(null);
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
        <Pressable onPress={handleLogoTap} hitSlop={8}>
          <Image
            source={require("../../assets/images/uoa-logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          {logoTapCount > 0 && (
            <View style={styles.tapDots}>
              {Array.from({ length: LOGO_TAPS_REQUIRED }).map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.tapDot,
                    { backgroundColor: i < logoTapCount ? colors.primary : colors.border },
                  ]}
                />
              ))}
            </View>
          )}
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
          icon="mic-outline"
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
        Featured Speakers
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.speakersScroll}
      >
        {SPEAKERS.map((speaker) => {
          const localImg = getSpeakerImage(speaker.id);
          const imgSource = localImg ?? { uri: speaker.photo };
          return (
            <Pressable
              key={speaker.id}
              onPress={() =>
                router.push({ pathname: "/speaker/[id]", params: { id: speaker.id } })
              }
              style={({ pressed }) => [
                styles.speakerCard,
                { backgroundColor: colors.card, borderColor: colors.border },
                pressed && { opacity: 0.85 },
              ]}
            >
              <Pressable
                onPress={() => setEnlargedPhoto({ src: imgSource, name: speaker.name })}
                hitSlop={4}
              >
                <Image
                  source={imgSource}
                  style={[styles.speakerPhoto, { backgroundColor: colors.muted }]}
                />
              </Pressable>
              <Text
                style={[styles.speakerName, { color: colors.foreground }]}
                numberOfLines={2}
              >
                {speaker.name}
              </Text>
              <Text
                style={[styles.speakerRole, { color: colors.mutedForeground }]}
                numberOfLines={2}
              >
                {speaker.company}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Modal
        visible={!!enlargedPhoto}
        transparent
        animationType="fade"
        onRequestClose={() => setEnlargedPhoto(null)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setEnlargedPhoto(null)}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            {enlargedPhoto && (
              <>
                <Image
                  source={enlargedPhoto.src}
                  style={styles.enlargedPhoto}
                  resizeMode="cover"
                />
                <Text style={[styles.enlargedName, { color: colors.foreground }]}>
                  {enlargedPhoto.name}
                </Text>
                <Text style={[styles.modalDismiss, { color: colors.mutedForeground }]}>
                  Tap anywhere to close
                </Text>
              </>
            )}
          </View>
        </Pressable>
      </Modal>
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
    alignItems: "flex-start",
  },
  logo: {
    width: 160,
    height: 60,
  },
  tapDots: {
    flexDirection: "row",
    gap: 5,
    justifyContent: "center",
    marginTop: 6,
    marginBottom: 2,
  },
  tapDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
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
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
    lineHeight: 34,
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
  speakersScroll: {
    paddingRight: 20,
    gap: 12,
    paddingBottom: 4,
  },
  speakerCard: {
    width: 120,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    alignItems: "center",
    gap: 8,
  },
  speakerPhoto: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  speakerName: {
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 16,
  },
  speakerRole: {
    fontSize: 11,
    textAlign: "center",
    lineHeight: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalContent: {
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    gap: 12,
    width: 280,
  },
  enlargedPhoto: {
    width: 240,
    height: 240,
    borderRadius: 120,
  },
  enlargedName: {
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  modalDismiss: {
    fontSize: 12,
  },
});
