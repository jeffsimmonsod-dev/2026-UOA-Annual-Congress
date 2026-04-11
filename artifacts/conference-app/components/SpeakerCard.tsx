import { router } from "expo-router";
import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { getSpeakerImage } from "@/services/speakerImages";
import type { Speaker } from "@/types";

interface Props {
  speaker: Speaker;
}

export default function SpeakerCard({ speaker }: Props) {
  const colors = useColors();

  const handlePress = () => {
    router.push({ pathname: "/speaker/[id]", params: { id: speaker.id } });
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
        pressed && { opacity: 0.85 },
      ]}
    >
      <Image
        source={getSpeakerImage(speaker.id) ?? { uri: speaker.photo }}
        style={[styles.photo, { backgroundColor: colors.muted }]}
      />
      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.foreground }]}>{speaker.name}</Text>
        <Text style={[styles.title, { color: colors.primary }]} numberOfLines={1}>
          {speaker.title}
        </Text>
        <Text style={[styles.company, { color: colors.mutedForeground }]}>
          {speaker.company}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    marginBottom: 10,
    gap: 14,
  },
  photo: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 15,
    fontWeight: "700",
  },
  title: {
    fontSize: 13,
    fontWeight: "500",
  },
  company: {
    fontSize: 12,
  },
});
