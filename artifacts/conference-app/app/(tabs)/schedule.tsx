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
import { useTabletLayout } from "@/hooks/useTabletLayout";
import { getSessionsByDay, getParaSessionsByDay } from "@/services/data";

const DOCTOR_DAYS = ["Thu, June 4", "Fri, June 5", "Sat, June 6", "Sun, June 7"];
const PARA_DAYS = ["Thu, June 4", "Fri, June 5", "Sat, June 6"];
const TABS = [...DOCTOR_DAYS, "Para"];

export default function ScheduleScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { contentStyle } = useTabletLayout();
  const [activeTab, setActiveTab] = useState("Thu, June 4");
  const doctorSessionsByDay = getSessionsByDay();
  const paraSessionsByDay = getParaSessionsByDay();
  const isWeb = Platform.OS === "web";

  const isPara = activeTab === "Para";

  const doctorSessions = isPara ? [] : (doctorSessionsByDay[activeTab] ?? []);

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

      <ScrollView
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
            {doctorSessions.filter(Boolean).map((session) => (
              <SessionCard key={session.id} session={session} />
            ))}
            {doctorSessions.length === 0 && (
              <View style={styles.empty}>
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                  No sessions scheduled
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
