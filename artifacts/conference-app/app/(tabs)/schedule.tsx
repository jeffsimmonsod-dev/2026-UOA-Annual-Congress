import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import SessionCard from "@/components/SessionCard";
import { useColors } from "@/hooks/useColors";
import { useConference } from "@/hooks/useConference";
import { useTabletLayout } from "@/hooks/useTabletLayout";
import { useConferenceData } from "@/context/ConferenceDataContext";
import type { Session } from "@/types";
import event from "@event";

const SCHEDULE = event.content.schedule;
const DOCTOR_DAYS = SCHEDULE.doctorDays;
const PARA_DAYS = SCHEDULE.paraDays;
// "Para" is the internal tab key; the visible label comes from the event.
const TABS = [...DOCTOR_DAYS, ...(PARA_DAYS.length > 0 ? ["Para"] : [])];

const TRACK_COLORS: Record<string, string> = event.content.scheduleTrackColors ?? event.content.trackColors;

const TRACK_SHORT_LABELS: Record<string, string> = event.content.trackShortLabels;

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

type Row =
  | { kind: "day"; key: string; day: string }
  | { kind: "session"; key: string; session: Session }
  | { kind: "empty"; key: string };

/** Horizontal distance (fraction of screen width) or fling speed that turns a drag into a day change. */
const SWIPE_DISTANCE_RATIO = 0.22;
const SWIPE_VELOCITY = 500;
const useNativeDriver = Platform.OS !== "web";

export default function ScheduleScreen() {
  const colors = useColors();
  const conf = useConference();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { contentStyle } = useTabletLayout();
  const { getSessionsByDay, getParaSessionsByDay } = useConferenceData();
  const [activeTab, setActiveTab] = useState<string>(TABS[0] ?? "");
  const [activeTrack, setActiveTrack] = useState<string | null>(null);
  // getSessionsByDay() groups and sorts on every call; only redo it when the data changes.
  const doctorSessionsByDay = useMemo(() => getSessionsByDay(), [getSessionsByDay]);
  const paraSessionsByDay = useMemo(() => getParaSessionsByDay(), [getParaSessionsByDay]);
  const isWeb = Platform.OS === "web";
  const listRef = useRef<FlatList<Row>>(null);
  const filterScrollRef = useRef<ScrollView>(null);

  // ── Swipe between days ───────────────────────────────────────────────────
  // The list follows the finger; past the threshold it slides out, the day
  // changes, and the new day slides in from the other side. The day selector
  // above stays in sync because both use the same activeTab state.
  const translateX = useRef(new Animated.Value(0)).current;
  const activeIndex = Math.max(0, TABS.indexOf(activeTab));
  const activeIndexRef = useRef(activeIndex);
  activeIndexRef.current = activeIndex;
  const incomingFrom = useRef<0 | 1 | -1>(0);

  useEffect(() => {
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
    filterScrollRef.current?.scrollTo({ x: 0, animated: false });
    setActiveTrack(null);
    const from = incomingFrom.current;
    incomingFrom.current = 0;
    if (from !== 0) {
      translateX.setValue(from * width * 0.35);
      Animated.timing(translateX, { toValue: 0, duration: 180, useNativeDriver }).start();
    } else {
      translateX.setValue(0);
    }
  }, [activeTab, translateX, width]);

  const selectDay = useCallback((tab: string) => {
    incomingFrom.current = 0;
    setActiveTab(tab);
  }, []);

  const finishSwipe = useCallback((direction: 1 | -1) => {
    const next = TABS[activeIndexRef.current + direction];
    if (!next) return;
    if (Platform.OS !== "web") void Haptics.selectionAsync().catch(() => {});
    incomingFrom.current = direction;
    setActiveTab(next);
  }, []);

  const daySwipe = useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        // Only claim clearly horizontal drags; vertical scrolling stays with the list.
        .activeOffsetX([-18, 18])
        .failOffsetY([-12, 12])
        .onUpdate((e) => {
          const index = activeIndexRef.current;
          const atEdge = (e.translationX > 0 && index === 0) || (e.translationX < 0 && index === TABS.length - 1);
          translateX.setValue(atEdge ? e.translationX * 0.2 : e.translationX);
        })
        .onEnd((e) => {
          const index = activeIndexRef.current;
          const direction: 1 | -1 = e.translationX < 0 ? 1 : -1;
          const target = index + direction;
          const farEnough =
            Math.abs(e.translationX) > width * SWIPE_DISTANCE_RATIO || Math.abs(e.velocityX) > SWIPE_VELOCITY;
          if (farEnough && target >= 0 && target < TABS.length) {
            Animated.timing(translateX, {
              toValue: -direction * width,
              duration: 140,
              useNativeDriver,
            }).start(() => finishSwipe(direction));
          } else {
            Animated.spring(translateX, { toValue: 0, useNativeDriver, bounciness: 0, speed: 20 }).start();
          }
        })
        .onFinalize((_e, success) => {
          if (!success) Animated.spring(translateX, { toValue: 0, useNativeDriver, bounciness: 0, speed: 20 }).start();
        }),
    [translateX, width, finishSwipe],
  );

  const isPara = activeTab === "Para";

  const doctorSessions: Session[] = useMemo(
    () => (isPara ? [] : (doctorSessionsByDay[activeTab] ?? [])),
    [isPara, doctorSessionsByDay, activeTab],
  );
  const trackOptions = useMemo(
    () => getUniqueTracks(doctorSessions.filter((s) => s.track !== "Meal / Social")),
    [doctorSessions],
  );

  const rows: Row[] = useMemo(() => {
    if (isPara) {
      const out: Row[] = [];
      for (const day of PARA_DAYS) {
        const paraSessions = (paraSessionsByDay[day] ?? []).filter(Boolean);
        if (paraSessions.length === 0) continue;
        out.push({ kind: "day", key: `day-${day}`, day });
        for (const session of paraSessions) out.push({ kind: "session", key: session.id, session });
      }
      return out;
    }
    const filtered = (activeTrack ? doctorSessions.filter((s) => s.track === activeTrack) : doctorSessions).filter(Boolean);
    if (filtered.length === 0) return [{ kind: "empty", key: "empty" }];
    return filtered.map((session) => ({ kind: "session", key: session.id, session }));
  }, [isPara, paraSessionsByDay, doctorSessions, activeTrack]);

  const renderRow = useCallback(
    ({ item }: { item: Row }) => {
      if (item.kind === "session") return <SessionCard session={item.session} />;
      if (item.kind === "day") {
        return (
          <View
            style={[
              styles.paraDayHeader,
              { backgroundColor: colors.primary + "12", borderColor: colors.primary + "30" },
              item.key !== rows[0]?.key && styles.paraGroupGap,
            ]}
          >
            <Text style={[styles.paraDayLabel, { color: colors.primary }]}>{item.day}</Text>
          </View>
        );
      }
      return (
        <View style={styles.empty}>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No sessions in this track</Text>
        </View>
      );
    },
    [colors, rows],
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <View
        style={[
          styles.headerBanner,
          {
            backgroundColor: colors.primary + "12",
            borderBottomColor: colors.primary + "30",
          },
        ]}
      >
        <Text style={[styles.headerTitle, { color: colors.primary }]}>
          {isPara ? SCHEDULE.paraScheduleTitle : SCHEDULE.mainScheduleTitle}
        </Text>
        <Text style={[styles.headerSubtitle, { color: colors.mutedForeground }]}>
          {isPara
            ? `${conf.conferenceName} · ${conf.paraCreditType}`
            : `${conf.conferenceName} · ${conf.creditType}`}
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
          const label = tab === "Para" ? SCHEDULE.paraTabLabel : tab.split(",")[0];
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
              onPress={() => selectDay(tab)}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
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

      <GestureDetector gesture={daySwipe}>
        <Animated.View style={[styles.sessionList, { transform: [{ translateX }] }]}>
          {/* Virtualized: only the visible session cards are rendered, so switching days stays smooth. */}
          <FlatList
            ref={listRef}
            data={rows}
            keyExtractor={(row) => row.key}
            renderItem={renderRow}
            initialNumToRender={8}
            maxToRenderPerBatch={8}
            windowSize={7}
            removeClippedSubviews={Platform.OS === "android"}
            contentContainerStyle={[
              styles.list,
              { paddingBottom: isWeb ? insets.bottom + 100 : 100 },
              contentStyle,
            ]}
            showsVerticalScrollIndicator={false}
          />
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  headerBanner: {
    paddingHorizontal: 16,
    paddingVertical: 8,
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
    flexGrow: 0,
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
  sessionList: {
    flex: 1,
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  paraGroupGap: {
    marginTop: 8,
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
