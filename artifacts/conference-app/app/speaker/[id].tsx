import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { getSessionsForSpeaker, getSpeakerById } from "@/services/data";
import { getSpeakerImage } from "@/services/speakerImages";

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

export default function SpeakerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const speaker = getSpeakerById(id);
  const isWeb = Platform.OS === "web";

  if (!speaker) {
    return (
      <View style={[styles.notFound, { backgroundColor: colors.background }]}>
        <Text style={[styles.notFoundText, { color: colors.mutedForeground }]}>
          Speaker not found
        </Text>
      </View>
    );
  }

  const sessions = getSessionsForSpeaker(speaker);

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.container,
        {
          paddingTop: isWeb ? insets.top + 16 : 16,
          paddingBottom: isWeb ? insets.bottom + 40 : 40,
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.profileSection}>
        <Image
          source={getSpeakerImage(speaker.id) ?? { uri: speaker.photo }}
          style={[styles.photo, { backgroundColor: colors.muted }]}
        />
        <Text style={[styles.name, { color: colors.foreground }]}>
          {speaker.name}
        </Text>
        <Text style={[styles.title, { color: colors.primary }]}>
          {speaker.title}
        </Text>
        <Text style={[styles.company, { color: colors.mutedForeground }]}>
          {speaker.company}
        </Text>
        {speaker.social && (
          <View style={styles.socialRow}>
            {speaker.social.twitter && (
              <View
                style={[styles.socialBadge, { backgroundColor: colors.accent }]}
              >
                <Text
                  style={[styles.socialText, { color: colors.accentForeground }]}
                >
                  {speaker.social.twitter}
                </Text>
              </View>
            )}
            {speaker.social.linkedin && (
              <View
                style={[styles.socialBadge, { backgroundColor: colors.accent }]}
              >
                <Text
                  style={[styles.socialText, { color: colors.accentForeground }]}
                >
                  in/{speaker.social.linkedin}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>

      <View
        style={[styles.bioCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          Biography
        </Text>
        <Text style={[styles.bio, { color: colors.foreground }]}>
          {speaker.bio}
        </Text>
      </View>

      {sessions.length > 0 && (
        <>
          <Text style={[styles.sessionsSectionTitle, { color: colors.foreground }]}>
            Sessions
          </Text>
          {sessions.map((session) => {
            const trackColor = TRACK_COLORS[session.track] ?? colors.primary;
            return (
              <Pressable
                key={session.id}
                onPress={() =>
                  router.push({
                    pathname: "/session/[id]",
                    params: { id: session.id },
                  })
                }
                style={({ pressed }) => [
                  styles.sessionCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    borderLeftColor: trackColor,
                  },
                  pressed && { opacity: 0.85 },
                ]}
              >
                <View
                  style={[
                    styles.sessionTrackBadge,
                    { backgroundColor: trackColor + "20" },
                  ]}
                >
                  <Text
                    style={[styles.sessionTrackText, { color: trackColor }]}
                  >
                    {session.track}
                  </Text>
                </View>
                <Text
                  style={[styles.sessionTitle, { color: colors.foreground }]}
                  numberOfLines={2}
                >
                  {session.title}
                </Text>
                <View style={styles.sessionMeta}>
                  <Ionicons
                    name="time-outline"
                    size={12}
                    color={colors.mutedForeground}
                  />
                  <Text
                    style={[
                      styles.sessionMetaText,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    {session.day} · {session.startTime} · {session.room}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    gap: 16,
  },
  notFound: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  notFoundText: {
    fontSize: 16,
  },
  profileSection: {
    alignItems: "center",
    paddingVertical: 8,
    gap: 6,
  },
  photo: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 8,
  },
  name: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
  },
  company: {
    fontSize: 14,
  },
  socialRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  socialBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  socialText: {
    fontSize: 12,
    fontWeight: "500",
  },
  bioCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  bio: {
    fontSize: 14,
    lineHeight: 24,
  },
  sessionsSectionTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  sessionCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderLeftWidth: 4,
    padding: 14,
    gap: 8,
  },
  sessionTrackBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  sessionTrackText: {
    fontSize: 11,
    fontWeight: "600",
  },
  sessionTitle: {
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
  },
  sessionMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  sessionMetaText: {
    fontSize: 12,
  },
});
