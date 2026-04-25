import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import React, { useState } from "react";
import {
  Image,
  Modal,
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
  const [selected, setSelected] = useState<Sponsor | null>(null);

  const tiers = (["platinum", "gold", "silver", "bronze"] as const).filter(
    (tier) => SPONSORS.some((s) => s.tier === tier)
  );

  return (
    <>
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
                <View style={[styles.tierBadge, { backgroundColor: tierConfig.bg }]}>
                  <Text style={[styles.tierLabel, { color: tierConfig.color }]}>
                    {tierConfig.label}
                  </Text>
                </View>
                <View style={[styles.tierLine, { backgroundColor: colors.border }]} />
              </View>
              {tierSponsors.map((sponsor) => (
                <SponsorCard
                  key={sponsor.id}
                  sponsor={sponsor}
                  colors={colors}
                  onPress={() => setSelected(sponsor)}
                />
              ))}
            </View>
          );
        })}
      </ScrollView>

      <SponsorDetailModal
        sponsor={selected}
        onClose={() => setSelected(null)}
        colors={colors}
        insets={insets}
      />
    </>
  );
}

function SponsorCard({
  sponsor,
  colors,
  onPress,
}: {
  sponsor: Sponsor;
  colors: any;
  onPress: () => void;
}) {
  const tierConfig = TIER_CONFIG[sponsor.tier];
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.88 : 1 },
      ]}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.logoContainer, { backgroundColor: colors.muted }]}>
          <Image source={{ uri: sponsor.logo }} style={styles.logo} resizeMode="contain" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.sponsorName, { color: colors.foreground }]}>{sponsor.name}</Text>
          <View style={styles.metaRow}>
            <View style={[styles.tierPip, { backgroundColor: tierConfig.bg }]}>
              <Text style={[styles.tierPipText, { color: tierConfig.color }]}>{tierConfig.label}</Text>
            </View>
            {sponsor.booth && (
              <View style={styles.boothRow}>
                <Ionicons name="location-outline" size={12} color={colors.mutedForeground} />
                <Text style={[styles.boothText, { color: colors.mutedForeground }]}>{sponsor.booth}</Text>
              </View>
            )}
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
      </View>
      <Text style={[styles.description, { color: colors.mutedForeground }]} numberOfLines={2}>
        {sponsor.description}
      </Text>
    </Pressable>
  );
}

function SponsorDetailModal({
  sponsor,
  onClose,
  colors,
  insets,
}: {
  sponsor: Sponsor | null;
  onClose: () => void;
  colors: any;
  insets: any;
}) {
  if (!sponsor) return null;

  const tierConfig = TIER_CONFIG[sponsor.tier];

  const handleWebsite = () => Linking.openURL(sponsor.website);
  const handlePhone = (phone: string) => Linking.openURL(`tel:${phone}`);
  const handleEmail = (email: string) => Linking.openURL(`mailto:${email}`);

  return (
    <Modal
      visible={!!sponsor}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.modalRoot, { backgroundColor: colors.background }]}>
        {/* Modal header */}
        <View style={[styles.modalHeader, { paddingTop: insets.top + 14, borderBottomColor: colors.border }]}>
          <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
            <Ionicons name="close" size={22} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.modalHeaderTitle, { color: colors.foreground }]} numberOfLines={1}>
            Sponsor Info
          </Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView
          contentContainerStyle={[styles.modalContent, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Logo + name block */}
          <View style={styles.modalHero}>
            <View style={[styles.modalLogoWrap, { backgroundColor: colors.muted }]}>
              <Image source={{ uri: sponsor.logo }} style={styles.modalLogo} resizeMode="contain" />
            </View>
            <Text style={[styles.modalName, { color: colors.foreground }]}>{sponsor.name}</Text>
            <View style={styles.modalBadgeRow}>
              <View style={[styles.tierBadge, { backgroundColor: tierConfig.bg }]}>
                <Text style={[styles.tierLabel, { color: tierConfig.color }]}>{tierConfig.label}</Text>
              </View>
              {sponsor.booth && (
                <View style={[styles.boothBadge, { backgroundColor: colors.accent, borderColor: colors.border }]}>
                  <Ionicons name="location-outline" size={12} color={colors.mutedForeground} />
                  <Text style={[styles.boothBadgeText, { color: colors.mutedForeground }]}>{sponsor.booth}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Description */}
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>About</Text>
            <Text style={[styles.sectionBody, { color: colors.mutedForeground }]}>{sponsor.description}</Text>
          </View>

          {/* Reps */}
          {sponsor.reps && sponsor.reps.length > 0 && (
            <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Representatives</Text>
              {sponsor.reps.map((rep, i) => (
                <View
                  key={i}
                  style={[
                    styles.repRow,
                    i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, marginTop: 12, paddingTop: 12 },
                  ]}
                >
                  <View style={[styles.repAvatar, { backgroundColor: tierConfig.bg }]}>
                    <Text style={[styles.repInitial, { color: tierConfig.color }]}>
                      {rep.name.charAt(0)}
                    </Text>
                  </View>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={[styles.repName, { color: colors.foreground }]}>{rep.name}</Text>
                    {rep.title && (
                      <Text style={[styles.repTitle, { color: colors.mutedForeground }]}>{rep.title}</Text>
                    )}
                    {rep.phone && (
                      <Pressable
                        onPress={() => handlePhone(rep.phone!)}
                        style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1, flexDirection: "row", alignItems: "center", gap: 5 })}
                      >
                        <Ionicons name="call-outline" size={13} color={colors.primary} />
                        <Text style={[styles.repContact, { color: colors.primary }]}>{rep.phone}</Text>
                      </Pressable>
                    )}
                    {rep.email && (
                      <Pressable
                        onPress={() => handleEmail(rep.email!)}
                        style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1, flexDirection: "row", alignItems: "center", gap: 5 })}
                      >
                        <Ionicons name="mail-outline" size={13} color={colors.primary} />
                        <Text style={[styles.repContact, { color: colors.primary }]}>{rep.email}</Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Website button */}
          <Pressable
            onPress={handleWebsite}
            style={({ pressed }) => [
              styles.websiteBtn,
              { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Ionicons name="globe-outline" size={18} color="#fff" />
            <Text style={styles.websiteBtnText}>Visit Website</Text>
            <Ionicons name="open-outline" size={14} color="#ffffffaa" />
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
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
    gap: 10,
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
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
    flexWrap: "wrap",
  },
  tierPip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  tierPipText: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  boothRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  boothText: {
    fontSize: 12,
  },
  description: {
    fontSize: 13,
    lineHeight: 19,
  },

  // Modal
  modalRoot: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  closeBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  modalHeaderTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: "700",
    textAlign: "center",
  },
  modalContent: {
    padding: 20,
    gap: 14,
  },
  modalHero: {
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
  },
  modalLogoWrap: {
    width: 88,
    height: 88,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  modalLogo: {
    width: 68,
    height: 68,
  },
  modalName: {
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: -0.3,
  },
  modalBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  boothBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  boothBadgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  section: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  sectionBody: {
    fontSize: 14,
    lineHeight: 22,
  },
  repRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  repAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  repInitial: {
    fontSize: 16,
    fontWeight: "800",
  },
  repName: {
    fontSize: 15,
    fontWeight: "700",
  },
  repTitle: {
    fontSize: 12,
    marginTop: -2,
  },
  repContact: {
    fontSize: 13,
  },
  websiteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 4,
  },
  websiteBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    flex: 1,
    textAlign: "center",
  },
});
