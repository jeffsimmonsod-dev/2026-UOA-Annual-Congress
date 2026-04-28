import React from "react";
import { Image, StyleSheet } from "react-native";

export default function ZoomableImage({ uri }: { uri: string }) {
  return (
    <Image
      source={{ uri }}
      style={styles.fsImage}
      resizeMode="contain"
    />
  );
}

const styles = StyleSheet.create({
  fsImage: {
    width: "100%",
    height: "100%",
  },
});
