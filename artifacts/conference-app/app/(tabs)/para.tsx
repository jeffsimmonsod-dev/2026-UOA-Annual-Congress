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
import { getParaSessionsByDay } from "@/services/data";

const DAYS = ["Thu, June 4", "Fri, June 5", "Sat, June 6"];

export default function ParaScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [activeDay, setActiveDay] = useState("Thu, June 4");
  const sessionsByDay = getParaSessionsByDay();
  const sessions = sessionsByDay[activeDay] ?? [];
  const isWeb = Platform.OS === "web";

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={[
          styles.headerBanner,
          { backgroundColor: colors.primary + "12", borderBottomColor: colors.primary + "30" },
        ]}
      >
        <Text style={[styles.headerTitle, { color: colors.primary }]}>
          Paraoptometric Education
        </Text>
        <Text style={[styles.headerSubtitle, { color: colors.mutedForeground }]}>
          2026 UOA Annual Congress · ABO/CPC Credit Available
        </Text>
      </View>

      <View
        style={[
          styles.dayTabs,
          {
            borderBottomColor: colors.border,
            paddingTop: 8,
          },
        ]}
      >
        {DAYS.map((day) => {
          const shortDay = day.split(",")[0];
          const count = sessionsByDay[day]?.length ?? 0;
          return (
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
                {shortDay}
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
                {count} {count === 1 ? "session" : "sessions"}
              </Text>
            </Pressable>
          );
        })}
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
        {sessions.filter(Boolean).map((session) => (
          <SessionCard key={session.id} session={session} />
        ))}
        {sessions.length === 0 && (
          <View style={styles.empty}>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              No sessions scheduled for this day
            </Text>
          </View>
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
