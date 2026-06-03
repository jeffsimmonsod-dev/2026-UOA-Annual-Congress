import React, { useEffect, useRef, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import SessionCard from "@/components/SessionCard";
import { useColors } from "@/hooks/useColors";
import { useTabletLayout } from "@/hooks/useTabletLayout";
import { getSessionsByDay, getParaSessionsByDay } from "@/services/data";
import type { Session } from "@/types";

const DOCTOR_DAYS = ["Thu, June 4", "Fri, June 5", "Sat, June 6", "Sun, June 7"];
const PARA_DAYS = ["Thu, June 4", "Fri, June 5", "Sat, June 6"];
const TABS = [...DOCTOR_DAYS, "Para"];

const TRACK_COLORS: Record<string, string> = {
  "Retinal Disease": "#ef4444",
  "Neuro-Optometry": "#8b5cf6",
  Glaucoma: "#10b981",
  Pharmacology: "#d946ef",
  "Practice Management": "#3b82f6",
  "Pediatrics & BV": "#ec4899",
  "ABO/CPC": "#3b82f6",
  General: "#64748b",
  Optical: "#f97316",
  "Contact Lenses": "#06b6d4",
  "Clinical Knowledge": "#84cc16",
  "Topical Diagnosis": "#14b8a6",
  "Ocular Disease": "#6366f1",
  "Systemic Disease": "#f97316",
  CPC: "#0ea5e9",
  CPO: "#0ea5e9",
  "ABO/CPO": "#0ea5e9",
  "Meal / Social": "#f59e0b",
};

const TRACK_SHORT_LABELS: Record<string, string> = {
  "Retinal Disease": "Retina",
  "Neuro-Optometry": "Neuro",
  Glaucoma: "Glaucoma",
  Pharmacology: "Pharm",
  "Practice Management": "Practice",
  "Pediatrics & BV": "Peds/BV",
  "Topical Diagnosis": "Anterior Seg",
  "Ocular Disease": "Ocular Dis.",
  "Systemic Disease": "Systemic",
  "Meal / Social": "Social",
};

function getShortLabel(track: string) {
  return TRACK_SHORT_LABELS[track] ?? track;
}

function getUniqueTracks(sessions: Session[]): string[] {
  const seen = new Set<string>();
  const tracks: string[] = [];
  for (const s of sessions) {
    if (s.track && s.track !== "Meal / Social" && !seen.has(s.track)) {
      seen.add(s.track);
      tracks.push(s.track);
    }
  }
  return tracks;
}

export default function ScheduleScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { contentStyle } = useTabletLayout();
  const [activeTab, setActiveTab] = useState("Thu, June 4");
  const [activeTrack, setActiveTrack] = useState<string | null>(null);
  const doctorSessionsByDay = getSessionsByDay();
  const paraSessionsByDay = getParaSessionsByDay();
  const isWeb = Platform.OS === "web";
  const scrollRef = useRef<ScrollView>(null);
  const filterScrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    filterScrollRef.current?.scrollTo({ x: 0, animated: false });
    setActiveTrack(null);
  }, [activeTab]);

  const isPara = activeTab === "Para";

  const doctorSessions: Session[] = isPara ? [] : (doctorSessionsByDay[activeTab] ?? []);
  const ceOnly = doctorSessions.filter((s) => s.track !== "Meal / Social");
  const trackOptions = getUniqueTracks(ceOnly);

  const filteredSessions = activeTrack
    ? doctorSessions.filter((s) => s.track === activeTrack)
    : doctorSessions;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={[
          styles.headerBanner,
          {
            backgroundColor: colors.primary + "12",
            borderBottomColor: colors.primary + "30",
            paddingTop: insets.top + 12,
          },
        ]}
      >
        <Text style={[styles.headerTitle, { color: colors.primary }]}>
          {isPara ? "Paraoptometric Education" : "Doctor Education Schedule"}
        </Text>
        <Text style={[styles.headerSubtitle, { color: colors.mutedForeground }]}>
          {isPara
            ? "2026 UOA Annual Congress · ABO/CPC Credit Available"
            : "2026 UOA Annual Congress · COPE CE Credit"}
        </Text>
      </View>

      {/* Day tabs */}
      <View
        style={[
          styles.dayTabs,
          { borderBottomColor: colors.border, paddingTop: 8 },
        ]}
      >
        {TABS.map((tab) => {
          const label = tab === "Para" ? "Para" : tab.split(",")[0];
          const isActive = activeTab === tab;
          const sessionCount =
            tab === "Para"
              ? PARA_DAYS.reduce(
                  (sum, d) => sum + (paraSessionsByDay[d]?.length ?? 0),
                  0
                )
              : (doctorSessionsByDay[tab]?.length ?? 0);
          return (
            <Pressable
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[
                styles.dayTab,
                isActive && {
                  borderBottomColor: colors.primary,
                  borderBottomWidth: 2,
                },
              ]}
            >
              <Text
                style={[
                  styles.dayTabText,
                  {
                    color: isActive ? colors.primary : colors.mutedForeground,
                    fontWeight: isActive ? "700" : "500",
                  },
                ]}
              >
                {label}
              </Text>
              <Text
                style={[
                  styles.dayCount,
                  { color: isActive ? colors.primary : colors.mutedForeground },
                ]}
              >
                {sessionCount} {sessionCount === 1 ? "session" : "sessions"}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Track filter chips — only for Doctor days with 2+ tracks */}
      {!isPara && trackOptions.length > 1 && (
        <ScrollView
          ref={filterScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
          style={[styles.filterStrip, { borderBottomColor: colors.border }]}
        >
          {/* "All" chip */}
          <Pressable
            onPress={() => setActiveTrack(null)}
            style={[
              styles.chip,
              {
                backgroundColor: activeTrack === null ? colors.primary : colors.muted,
                borderColor: activeTrack === null ? colors.primary : colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.chipText,
                { color: activeTrack === null ? "#fff" : colors.mutedForeground },
              ]}
            >
              All
            </Text>
          </Pressable>

          {trackOptions.map((track) => {
            const trackColor = TRACK_COLORS[track] ?? colors.primary;
            const isActive = activeTrack === track;
            return (
              <Pressable
                key={track}
                onPress={() => setActiveTrack(isActive ? null : track)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: isActive ? trackColor : trackColor + "18",
                    borderColor: isActive ? trackColor : trackColor + "50",
                  },
                ]}
              >
                <View style={[styles.chipDot, { backgroundColor: isActive ? "#fff" : trackColor }]} />
                <Text
                  style={[
                    styles.chipText,
                    { color: isActive ? "#fff" : trackColor, fontWeight: isActive ? "700" : "500" },
                  ]}
                >
                  {getShortLabel(track)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: isWeb ? insets.bottom + 100 : 100 },
          contentStyle,
        ]}
        showsVerticalScrollIndicator={false}
      >
        {isPara ? (
          PARA_DAYS.map((day) => {
            const paraSessions = paraSessionsByDay[day] ?? [];
            if (paraSessions.length === 0) return null;
            return (
              <View key={day} style={styles.paraGroup}>
                <View
                  style={[
                    styles.paraDayHeader,
                    { backgroundColor: colors.primary + "12", borderColor: colors.primary + "30" },
                  ]}
                >
                  <Text style={[styles.paraDayLabel, { color: colors.primary }]}>
                    {day}
                  </Text>
                </View>
                {paraSessions.filter(Boolean).map((session) => (
                  <SessionCard key={session.id} session={session} />
                ))}
              </View>
            );
          })
        ) : (
          <>
            {filteredSessions.filter(Boolean).map((session) => (
              <SessionCard key={session.id} session={session} />
            ))}
            {filteredSessions.length === 0 && (
              <View style={styles.empty}>
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                  No sessions in this track
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  headerBanner: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 2,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  headerSubtitle: {
    fontSize: 12,
  },
  dayTabs: {
    flexDirection: "row",
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 4,
  },
  dayTab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 2,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  dayTabText: {
    fontSize: 13,
  },
  dayCount: {
    fontSize: 10,
    marginTop: 2,
  },
  filterStrip: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexShrink: 0,
  },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    gap: 5,
  },
  chipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  chipText: {
    fontSize: 12,
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  paraGroup: {
    marginBottom: 8,
  },
  paraDayHeader: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 8,
  },
  paraDayLabel: {
    fontSize: 13,
    fontWeight: "700",
  },
  empty: {
    paddingTop: 60,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 15,
  },
});
