import React, { useState } from "react";
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
import { getSessionsByDay } from "@/services/data";

const DAYS = ["Day 1", "Day 2", "Day 3"];

export default function ScheduleScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [activeDay, setActiveDay] = useState("Day 1");
  const sessionsByDay = getSessionsByDay();
  const sessions = sessionsByDay[activeDay] ?? [];
  const isWeb = Platform.OS === "web";

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={[
          styles.dayTabs,
          {
            borderBottomColor: colors.border,
            paddingTop: isWeb ? insets.top + 8 : 8,
          },
        ]}
      >
        {DAYS.map((day) => (
          <Pressable
            key={day}
            onPress={() => setActiveDay(day)}
            style={[
              styles.dayTab,
              activeDay === day && {
                borderBottomColor: colors.primary,
                borderBottomWidth: 2,
              },
            ]}
          >
            <Text
              style={[
                styles.dayTabText,
                {
                  color:
                    activeDay === day ? colors.primary : colors.mutedForeground,
                  fontWeight: activeDay === day ? "700" : "500",
                },
              ]}
            >
              {day}
            </Text>
            <Text
              style={[
                styles.dayCount,
                {
                  color:
                    activeDay === day
                      ? colors.primary
                      : colors.mutedForeground,
                },
              ]}
            >
              {sessionsByDay[day]?.length ?? 0} sessions
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.list,
          {
            paddingBottom: isWeb ? insets.bottom + 100 : 100,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {sessions.map((session) => (
          <SessionCard key={session.id} session={session} />
        ))}
        {sessions.length === 0 && (
          <View style={styles.empty}>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              No sessions scheduled
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  dayTabs: {
    flexDirection: "row",
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
  },
  dayTab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  dayTabText: {
    fontSize: 15,
  },
  dayCount: {
    fontSize: 11,
    marginTop: 2,
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  empty: {
    paddingTop: 60,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 15,
  },
});
