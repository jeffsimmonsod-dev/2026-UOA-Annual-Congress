import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Image, ImageSourcePropType, Pressable, StyleSheet, Text } from "react-native";
import { useColors } from "@/hooks/useColors";

interface Props {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  imageSource?: ImageSourcePropType;
  color?: string;
  onPress: () => void;
}

export default function QuickActionButton({ label, icon, imageSource, color, onPress }: Props) {
  const colors = useColors();
  const tint = color ?? colors.primary;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: tint + "15", borderColor: tint + "40" },
        pressed && { opacity: 0.75 },
      ]}
    >
      {imageSource ? (
        <Image source={imageSource} style={styles.image} resizeMode="contain" />
      ) : icon ? (
        <Ionicons name={icon} size={24} color={tint} />
      ) : null}
      <Text style={[styles.label, { color: tint }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
    minWidth: 80,
  },
  image: {
    width: 28,
    height: 28,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
});
