import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import React from "react";
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useTabletLayout } from "@/hooks/useTabletLayout";
import { SPONSORS } from "@/services/data";
import type { Sponsor } from "@/types";

const TIER_CONFIG = {
  platinum: { label: "Platinum", color: "#5b21b6", bg: "#e8e4f8" },
  gold: { label: "Gold", color: "#92400e", bg: "#fef3c7" },
  silver: { label: "Silver", color: "#475569", bg: "#f1f5f9" },
  bronze: { label: "Bronze", color: "#78350f", bg: "#fef3c7" },
};

export default function SponsorsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { contentStyle } = useTabletLayout();
  const isWeb = Platform.OS === "web";

  const tiers = (["platinum", "gold", "silver", "bronze"] as const).filter(
    (tier) => SPONSORS.some((s) => s.tier === tier)
  );

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
      {tiers.map((tier) => {
        const tierConfig = TIER_CONFIG[tier];
        const tierSponsors = SPONSORS.filter((s) => s.tier === tier);
        return (
          <View key={tier}>
            <View style={styles.tierHeader}>
              <View
                style={[
                  styles.tierBadge,
                  { backgroundColor: tierConfig.bg },
                ]}
              >
                <Text style={[styles.tierLabel, { color: tierConfig.color }]}>
                  {tierConfig.label}
                </Text>
              </View>
              <View
                style={[styles.tierLine, { backgroundColor: colors.border }]}
              />
            </View>
            {tierSponsors.map((sponsor) => (
              <SponsorCard key={sponsor.id} sponsor={sponsor} colors={colors} />
            ))}
          </View>
        );
      })}
    </ScrollView>
  );
}

function SponsorCard({ sponsor, colors }: { sponsor: Sponsor; colors: any }) {
  const handleWebsite = () => Linking.openURL(sponsor.website);

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View style={styles.cardHeader}>
        <View
          style={[styles.logoContainer, { backgroundColor: colors.muted }]}
        >
          <Image
            source={{ uri: sponsor.logo }}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.sponsorName, { color: colors.foreground }]}>
            {sponsor.name}
          </Text>
          {sponsor.booth && (
            <View style={styles.boothRow}>
              <Ionicons
                name="location-outline"
                size={12}
                color={colors.mutedForeground}
              />
              <Text
                style={[styles.boothText, { color: colors.mutedForeground }]}
              >
                {sponsor.booth}
              </Text>
            </View>
          )}
        </View>
      </View>
      <Text
        style={[styles.description, { color: colors.mutedForeground }]}
        numberOfLines={3}
      >
        {sponsor.description}
      </Text>
      <Pressable
        onPress={handleWebsite}
        style={({ pressed }) => [
          styles.websiteButton,
          {
            backgroundColor: colors.secondary,
            borderColor: colors.border,
            opacity: pressed ? 0.75 : 1,
          },
        ]}
      >
        <Ionicons name="globe-outline" size={14} color={colors.primary} />
        <Text style={[styles.websiteText, { color: colors.primary }]}>
          {sponsor.website.replace("https://", "")}
        </Text>
        <Ionicons
          name="open-outline"
          size={12}
          color={colors.mutedForeground}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
  },
  tierHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 16,
    marginBottom: 12,
  },
  tierBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  tierLabel: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  tierLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  logoContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  logo: {
    width: 44,
    height: 44,
  },
  sponsorName: {
    fontSize: 16,
    fontWeight: "700",
  },
  boothRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 3,
  },
  boothText: {
    fontSize: 12,
  },
  description: {
    fontSize: 13,
    lineHeight: 20,
  },
  websiteButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: "flex-start",
  },
  websiteText: {
    fontSize: 13,
    fontWeight: "500",
  },
});
