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
import { useColors } from "@/hooks/useColors";
import { useTabletLayout } from "@/hooks/useTabletLayout";
import { UPDATES } from "@/services/data";
import type { Update } from "@/types";

const TYPE_CONFIG: Record<
  Update["type"],
  { icon: keyof typeof Ionicons.glyphMap; color: string; label: string }
> = {
  announcement: {
    icon: "megaphone-outline",
    color: "#4f46e5",
    label: "Announcement",
  },
  schedule: {
    icon: "calendar-outline",
    color: "#f59e0b",
    label: "Schedule",
  },
  info: {
    icon: "information-circle-outline",
    color: "#3b82f6",
    label: "Info",
  },
  alert: {
    icon: "warning-outline",
    color: "#ef4444",
    label: "Alert",
  },
};

function formatTime(timestamp: string) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(timestamp: string) {
  const date = new Date(timestamp);
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function UpdatesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { contentStyle } = useTabletLayout();
  const isWeb = Platform.OS === "web";

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.container,
        {
          paddingTop: isWeb ? insets.top + 16 : 16,
          paddingBottom: isWeb ? insets.bottom + 40 : 40,
        },
        contentStyle,
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
        Live updates from the conference team
      </Text>
      {UPDATES.map((update, i) => {
        const config = TYPE_CONFIG[update.type];
        const isLast = i === UPDATES.length - 1;
        return (
          <View key={update.id} style={styles.updateWrapper}>
            <View style={styles.timelineLeft}>
              <View
                style={[styles.iconCircle, { backgroundColor: config.color + "18" }]}
              >
                <Ionicons name={config.icon} size={18} color={config.color} />
              </View>
              {!isLast && (
                <View
                  style={[styles.timelineLine, { backgroundColor: colors.border }]}
                />
              )}
            </View>
            <View
              style={[
                styles.updateCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View style={styles.updateHeader}>
                <View
                  style={[styles.typeBadge, { backgroundColor: config.color + "18" }]}
                >
                  <Text
                    style={[styles.typeText, { color: config.color }]}
                  >
                    {config.label}
                  </Text>
                </View>
                <Text
                  style={[styles.timestamp, { color: colors.mutedForeground }]}
                >
                  {formatDate(update.timestamp)} · {formatTime(update.timestamp)}
                </Text>
              </View>
              <Text style={[styles.updateTitle, { color: colors.foreground }]}>
                {update.title}
              </Text>
              <Text style={[styles.updateBody, { color: colors.foreground }]}>
                {update.body}
              </Text>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    gap: 0,
  },
  subtitle: {
    fontSize: 13,
    marginBottom: 20,
    marginTop: 4,
  },
  updateWrapper: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 4,
  },
  timelineLeft: {
    alignItems: "center",
    width: 40,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    marginTop: 4,
    marginBottom: 4,
  },
  updateCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
    gap: 8,
  },
  updateHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  timestamp: {
    fontSize: 11,
  },
  updateTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  updateBody: {
    fontSize: 14,
    lineHeight: 22,
  },
});
