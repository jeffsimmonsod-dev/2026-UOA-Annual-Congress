import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import SessionCard from "@/components/SessionCard";
import { useSchedule } from "@/context/ScheduleContext";
import { useColors } from "@/hooks/useColors";
import { SESSIONS, PARA_SESSIONS } from "@/services/data";

export default function MyScheduleScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { savedIds } = useSchedule();
  const isWeb = Platform.OS === "web";

  const allSessions = [...SESSIONS, ...PARA_SESSIONS];
  const savedSessions = allSessions.filter((s) => savedIds.has(s.id));

  const byDay: Record<string, typeof savedSessions> = {};
  for (const session of savedSessions) {
    if (!byDay[session.day]) byDay[session.day] = [];
    byDay[session.day].push(session);
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.container,
        {
          paddingTop: isWeb ? insets.top + 16 : 16,
          paddingBottom: isWeb ? insets.bottom + 100 : 100,
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {savedSessions.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons
            name="bookmark-outline"
            size={56}
            color={colors.mutedForeground}
          />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            No saved sessions yet
          </Text>
          <Text style={[styles.emptySubtext, { color: colors.mutedForeground }]}>
            Tap the bookmark icon on any session in the Schedule or Para tab to save it here for quick access.
          </Text>
        </View>
      ) : (
        <>
          <Text style={[styles.savedCount, { color: colors.mutedForeground }]}>
            {savedSessions.length} session{savedSessions.length !== 1 ? "s" : ""} saved
          </Text>
          {Object.entries(byDay).map(([day, sessions]) => (
            <View key={day}>
              <Text style={[styles.dayHeader, { color: colors.primary }]}>
                {day}
              </Text>
              {sessions.map((session) => (
                <SessionCard key={session.id} session={session} />
              ))}
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: 12,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
  },
  savedCount: {
    fontSize: 13,
    marginBottom: 12,
    marginTop: 4,
  },
  dayHeader: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 8,
  },
});
