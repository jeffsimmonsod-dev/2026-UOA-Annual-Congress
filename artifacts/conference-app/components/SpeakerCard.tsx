import { router } from "expo-router";
import React, { useState } from "react";
import { Image, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { getSpeakerImage } from "@/services/speakerImages";
import type { Speaker } from "@/types";

interface Props {
  speaker: Speaker;
}

export default function SpeakerCard({ speaker }: Props) {
  const colors = useColors();
  const [photoEnlarged, setPhotoEnlarged] = useState(false);
  const localImg = getSpeakerImage(speaker.id);
  const imgSource = localImg ?? { uri: speaker.photo };

  const handleCardPress = () => {
    router.push({ pathname: "/speaker/[id]", params: { id: speaker.id } });
  };

  return (
    <>
      <Pressable
        onPress={handleCardPress}
        style={({ pressed }) => [
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.border },
          pressed && { opacity: 0.85 },
        ]}
      >
        <Pressable
          onPress={() => setPhotoEnlarged(true)}
          hitSlop={4}
        >
          <Image
            source={imgSource}
            style={[styles.photo, { backgroundColor: colors.muted }]}
          />
        </Pressable>
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

      <Modal
        visible={photoEnlarged}
        transparent
        animationType="fade"
        onRequestClose={() => setPhotoEnlarged(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setPhotoEnlarged(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Image
              source={imgSource}
              style={styles.enlargedPhoto}
              resizeMode="cover"
            />
            <Text style={[styles.enlargedName, { color: colors.foreground }]}>
              {speaker.name}
            </Text>
            <Text style={[styles.modalDismiss, { color: colors.mutedForeground }]}>
              Tap anywhere to close
            </Text>
          </View>
        </Pressable>
      </Modal>
    </>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalContent: {
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    gap: 12,
    width: 280,
  },
  enlargedPhoto: {
    width: 240,
    height: 240,
    borderRadius: 120,
  },
  enlargedName: {
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  modalDismiss: {
    fontSize: 12,
  },
});
