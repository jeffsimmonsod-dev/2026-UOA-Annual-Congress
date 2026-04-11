import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
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
import { useSchedule } from "@/context/ScheduleContext";
import { useColors } from "@/hooks/useColors";
import { getSessionById, getSpeakersForSession } from "@/services/data";

const TRACK_COLORS: Record<string, string> = {
  Architecture: "#6366f1",
  Frontend: "#ec4899",
  Backend: "#14b8a6",
  "AI & ML": "#f59e0b",
  "Data & AI": "#f59e0b",
  DevOps: "#10b981",
  Workshops: "#8b5cf6",
  "Open Source": "#3b82f6",
  Keynote: "#ef4444",
};

export default function SessionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { isSaved, toggleSession } = useSchedule();
  const session = getSessionById(id);
  const isWeb = Platform.OS === "web";

  if (!session) {
    return (
      <View style={[styles.notFound, { backgroundColor: colors.background }]}>
        <Text style={[styles.notFoundText, { color: colors.mutedForeground }]}>
          Session not found
        </Text>
      </View>
    );
  }

  const speakers = getSpeakersForSession(session);
  const saved = isSaved(session.id);
  const trackColor = TRACK_COLORS[session.track] ?? colors.primary;

  const handleSave = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    toggleSession(session.id);
  };

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
      <View style={styles.header}>
        <View
          style={[styles.trackBadge, { backgroundColor: trackColor + "20" }]}
        >
          <View
            style={[styles.trackDot, { backgroundColor: trackColor }]}
          />
          <Text style={[styles.trackText, { color: trackColor }]}>
            {session.track}
          </Text>
        </View>
      </View>

      <Text style={[styles.title, { color: colors.foreground }]}>
        {session.title}
      </Text>

      <View style={[styles.metaCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <MetaRow
          icon="time-outline"
          label="Time"
          value={`${session.startTime} – ${session.endTime}`}
          colors={colors}
        />
        <MetaRow
          icon="location-outline"
          label="Room"
          value={session.room}
          colors={colors}
        />
        <MetaRow
          icon="calendar-outline"
          label="Day"
          value={session.day}
          colors={colors}
        />
      </View>

      {session.tags && session.tags.length > 0 && (
        <View style={styles.tagsRow}>
          {session.tags.map((tag) => (
            <View
              key={tag}
              style={[styles.tag, { backgroundColor: colors.accent }]}
            >
              <Text style={[styles.tagText, { color: colors.accentForeground }]}>
                {tag}
              </Text>
            </View>
          ))}
        </View>
      )}

      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
        About this session
      </Text>
      <Text style={[styles.description, { color: colors.foreground }]}>
        {session.description}
      </Text>

      {speakers.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            {speakers.length === 1 ? "Speaker" : "Speakers"}
          </Text>
          {speakers.map((speaker) => (
            <Pressable
              key={speaker.id}
              onPress={() =>
                router.push({
                  pathname: "/speaker/[id]",
                  params: { id: speaker.id },
                })
              }
              style={({ pressed }) => [
                styles.speakerRow,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
                pressed && { opacity: 0.85 },
              ]}
            >
              <View
                style={[styles.speakerAvatar, { backgroundColor: colors.accent }]}
              >
                <Text
                  style={[styles.speakerInitial, { color: colors.primary }]}
                >
                  {speaker.name[0]}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.speakerName, { color: colors.foreground }]}>
                  {speaker.name}
                </Text>
                <Text
                  style={[styles.speakerRole, { color: colors.mutedForeground }]}
                >
                  {speaker.title} · {speaker.company}
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={colors.mutedForeground}
              />
            </Pressable>
          ))}
        </>
      )}

      <Pressable
        onPress={handleSave}
        style={({ pressed }) => [
          styles.saveButton,
          {
            backgroundColor: saved ? colors.primary : colors.card,
            borderColor: saved ? colors.primary : colors.border,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
      >
        <Ionicons
          name={saved ? "bookmark" : "bookmark-outline"}
          size={20}
          color={saved ? "#fff" : colors.primary}
        />
        <Text
          style={[
            styles.saveButtonText,
            { color: saved ? "#fff" : colors.primary },
          ]}
        >
          {saved ? "Saved to My Schedule" : "Save to My Schedule"}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

function MetaRow({
  icon,
  label,
  value,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  colors: any;
}) {
  return (
    <View style={styles.metaRow}>
      <Ionicons name={icon} size={16} color={colors.primary} />
      <Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>
        {label}
      </Text>
      <Text style={[styles.metaValue, { color: colors.foreground }]}>
        {value}
      </Text>
    </View>
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
  header: {
    marginTop: 4,
  },
  trackBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  trackDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  trackText: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.3,
    lineHeight: 34,
  },
  metaCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  metaLabel: {
    fontSize: 13,
    width: 48,
  },
  metaValue: {
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  tagText: {
    fontSize: 12,
    fontWeight: "500",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  description: {
    fontSize: 15,
    lineHeight: 24,
  },
  speakerRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  speakerAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
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
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingVertical: 16,
    marginTop: 4,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: "700",
  },
});
