import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSchedule } from "@/context/ScheduleContext";
import { useColors } from "@/hooks/useColors";
import type { Session } from "@/types";
import { getSpeakersForSession } from "@/services/data";

interface Props {
  session: Session;
  showDay?: boolean;
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

export default function SessionCard({ session, showDay = false }: Props) {
  const colors = useColors();
  const { isSaved, toggleSession } = useSchedule();
  const saved = isSaved(session.id);
  const speakers = getSpeakersForSession(session);
  const trackColor = TRACK_COLORS[session.track] ?? colors.primary;

  const handlePress = () => {
    router.push({ pathname: "/session/[id]", params: { id: session.id } });
  };

  const handleSave = (e: any) => {
    e.stopPropagation?.();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleSession(session.id);
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
        pressed && { opacity: 0.85 },
      ]}
    >
      <View style={[styles.trackBar, { backgroundColor: trackColor }]} />
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={[styles.trackBadge, { backgroundColor: trackColor + "22" }]}>
            <Text style={[styles.trackText, { color: trackColor }]}>
              {session.track}
            </Text>
          </View>
          <Pressable onPress={handleSave} hitSlop={10}>
            <Ionicons
              name={saved ? "bookmark" : "bookmark-outline"}
              size={20}
              color={saved ? colors.primary : colors.mutedForeground}
            />
          </Pressable>
        </View>

        <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={2}>
          {session.title}
        </Text>

        <View style={styles.meta}>
          <View style={styles.metaRow}>
            <Ionicons name="time-outline" size={13} color={colors.mutedForeground} />
            <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
              {session.startTime} – {session.endTime}
            </Text>
          </View>
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={13} color={colors.mutedForeground} />
            <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
              {session.room}
            </Text>
          </View>
          {showDay && (
            <View style={styles.metaRow}>
              <Ionicons name="calendar-outline" size={13} color={colors.mutedForeground} />
              <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                {session.day}
              </Text>
            </View>
          )}
        </View>

        {speakers.length > 0 && (
          <Text style={[styles.speaker, { color: colors.mutedForeground }]}>
            {speakers.map((sp) => sp.name).join(", ")}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    overflow: "hidden",
    marginBottom: 12,
  },
  trackBar: {
    width: 4,
  },
  content: {
    flex: 1,
    padding: 14,
    gap: 8,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  trackBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  trackText: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 21,
  },
  meta: {
    gap: 4,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  metaText: {
    fontSize: 12,
  },
  speaker: {
    fontSize: 12,
    fontStyle: "italic",
    marginTop: 2,
  },
});
