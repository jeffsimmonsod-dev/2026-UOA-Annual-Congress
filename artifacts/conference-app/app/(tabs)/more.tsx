import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { CONFERENCE } from "@/services/data";

interface MenuItem {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  route?: string;
  action?: () => void;
  description: string;
}

const useMenuItems = (): MenuItem[] => {
  const isIOS = Platform.OS === "ios";
  return [
    ...(isIOS
      ? [
          {
            label: "Para Education",
            icon: "people-outline" as keyof typeof Ionicons.glyphMap,
            color: "#0ea5e9",
            route: "/(tabs)/para",
            description: "Paraoptometric CE schedule",
          },
        ]
      : []),
    {
      label: "Speakers",
      icon: "person-circle-outline",
      color: "#6366f1",
      route: "/(tabs)/speakers",
      description: "Faculty & course presenters",
    },
    {
      label: "Venue & Hotel",
      icon: "location-outline",
      color: "#14b8a6",
      route: "/(tabs)/venue",
      description: "Grand Hyatt Deer Valley",
    },
    {
      label: "Sponsors & Exhibitors",
      icon: "ribbon-outline",
      color: "#f59e0b",
      route: "/sponsors",
      description: "Partners & exhibitor hall",
    },
    {
      label: "Updates",
      icon: "notifications-outline",
      color: "#ef4444",
      route: "/updates",
      description: "Announcements & alerts",
    },
    {
      label: "FAQ",
      icon: "help-circle-outline",
      color: "#10b981",
      route: "/faq",
      description: "Frequently asked questions",
    },
    {
      label: "Register Online",
      icon: "open-outline",
      color: "#8b5cf6",
      action: () => Linking.openURL("https://www.utaheyedoc.org/2026_uoa_annual_congress.php"),
      description: "Open UOA registration website",
    },
  ];
};

export default function MoreScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const menuItems = useMenuItems();

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
      <View style={[styles.conferenceTag, { backgroundColor: colors.accent }]}>
        <Ionicons name="eye-outline" size={14} color={colors.primary} />
        <Text style={[styles.conferenceTagText, { color: colors.primary }]}>
          {CONFERENCE.name} · {CONFERENCE.dates}
        </Text>
      </View>

      <View style={[styles.menuCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {menuItems.map((item, index) => (
          <Pressable
            key={item.label}
            onPress={() => {
              if (item.action) {
                item.action();
              } else if (item.route) {
                router.push(item.route as any);
              }
            }}
            style={({ pressed }) => [
              styles.menuItem,
              index < menuItems.length - 1 && {
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderBottomColor: colors.border,
              },
              pressed && { backgroundColor: colors.muted },
            ]}
          >
            <View
              style={[styles.menuIcon, { backgroundColor: item.color + "18" }]}
            >
              <Ionicons name={item.icon} size={20} color={item.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.menuLabel, { color: colors.foreground }]}>
                {item.label}
              </Text>
              <Text style={[styles.menuDesc, { color: colors.mutedForeground }]}>
                {item.description}
              </Text>
            </View>
            <Ionicons
              name={item.action ? "open-outline" : "chevron-forward"}
              size={16}
              color={colors.mutedForeground}
            />
          </Pressable>
        ))}
      </View>

      <View
        style={[styles.contactCard, { backgroundColor: colors.primary + "10", borderColor: colors.primary + "30" }]}
      >
        <Text style={[styles.contactTitle, { color: colors.foreground }]}>
          Need Help?
        </Text>
        <Text style={[styles.contactText, { color: colors.mutedForeground }]}>
          Contact {CONFERENCE.contactName} at the Utah Optometric Association:{"\n"}
          <Text
            style={{ color: colors.primary }}
            onPress={() => Linking.openURL(`tel:${CONFERENCE.contactPhone}`)}
          >
            {CONFERENCE.contactPhone}
          </Text>
          {" · "}
          <Text
            style={{ color: colors.primary }}
            onPress={() => Linking.openURL(`mailto:${CONFERENCE.contactEmail}`)}
          >
            {CONFERENCE.contactEmail}
          </Text>
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    gap: 16,
  },
  conferenceTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  conferenceTagText: {
    fontSize: 12,
    fontWeight: "600",
  },
  menuCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 14,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  menuLabel: {
    fontSize: 15,
    fontWeight: "600",
  },
  menuDesc: {
    fontSize: 12,
    marginTop: 1,
  },
  contactCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
  contactTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  contactText: {
    fontSize: 13,
    lineHeight: 22,
  },
});
