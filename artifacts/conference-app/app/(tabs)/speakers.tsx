import React from "react";
import { Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import SpeakerCard from "@/components/SpeakerCard";
import { useColors } from "@/hooks/useColors";
import { SPEAKERS } from "@/services/data";

export default function SpeakersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";

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
      <Text style={[styles.header, { color: colors.mutedForeground }]}>
        {SPEAKERS.length} speakers
      </Text>
      {SPEAKERS.map((speaker) => (
        <SpeakerCard key={speaker.id} speaker={speaker} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
  },
  header: {
    fontSize: 13,
    marginBottom: 12,
    marginTop: 4,
  },
});
