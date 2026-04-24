import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import SpeakerCard from "@/components/SpeakerCard";
import { useColors } from "@/hooks/useColors";
import { useTabletLayout } from "@/hooks/useTabletLayout";
import { SPEAKERS } from "@/services/data";

export default function SpeakersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { contentStyle } = useTabletLayout();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Speakers</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 100 }, contentStyle]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.count, { color: colors.mutedForeground }]}>
          {SPEAKERS.length} speakers
        </Text>
        {SPEAKERS.map((speaker) => (
          <SpeakerCard key={speaker.id} speaker={speaker} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 40, alignItems: "flex-start" },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: "700", textAlign: "center" },
  container: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  count: {
    fontSize: 13,
    marginBottom: 12,
    marginTop: 4,
  },
});
