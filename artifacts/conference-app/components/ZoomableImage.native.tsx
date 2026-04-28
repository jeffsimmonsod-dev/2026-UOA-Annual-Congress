import React from "react";
import { Dimensions, StyleSheet } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

const SCREEN = Dimensions.get("window");

export default function ZoomableImage({ uri }: { uri: string }) {
  const scale = useSharedValue(1);
  const offsetX = useSharedValue(0);
  const offsetY = useSharedValue(0);
  const savedScale = useSharedValue(1);
  const savedOffsetX = useSharedValue(0);
  const savedOffsetY = useSharedValue(0);

  const W = SCREEN.width;
  const H = SCREEN.height * 0.72;

  const resetToFit = () => {
    "worklet";
    scale.value = withSpring(1, { damping: 15 });
    offsetX.value = withSpring(0, { damping: 15 });
    offsetY.value = withSpring(0, { damping: 15 });
    savedScale.value = 1;
    savedOffsetX.value = 0;
    savedOffsetY.value = 0;
  };

  const clampOffset = (x: number, y: number, s: number) => {
    "worklet";
    const maxX = Math.max(0, (W * (s - 1)) / 2);
    const maxY = Math.max(0, (H * (s - 1)) / 2);
    return {
      x: Math.min(maxX, Math.max(-maxX, x)),
      y: Math.min(maxY, Math.max(-maxY, y)),
    };
  };

  const pinchGesture = Gesture.Pinch()
    .onBegin(() => {
      savedScale.value = scale.value;
      savedOffsetX.value = offsetX.value;
      savedOffsetY.value = offsetY.value;
    })
    .onUpdate((e) => {
      const newScale = Math.min(6, Math.max(1, savedScale.value * e.scale));
      scale.value = newScale;
      const fx = e.focalX - W / 2;
      const fy = e.focalY - H / 2;
      const delta = newScale / savedScale.value - 1;
      const clamped = clampOffset(
        savedOffsetX.value - fx * delta,
        savedOffsetY.value - fy * delta,
        newScale
      );
      offsetX.value = clamped.x;
      offsetY.value = clamped.y;
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      savedOffsetX.value = offsetX.value;
      savedOffsetY.value = offsetY.value;
      if (scale.value < 1.05) resetToFit();
    });

  const panGesture = Gesture.Pan()
    .averageTouches(true)
    .minDistance(4)
    .onBegin(() => {
      savedOffsetX.value = offsetX.value;
      savedOffsetY.value = offsetY.value;
    })
    .onUpdate((e) => {
      if (scale.value <= 1.05) return;
      const clamped = clampOffset(
        savedOffsetX.value + e.translationX,
        savedOffsetY.value + e.translationY,
        scale.value
      );
      offsetX.value = clamped.x;
      offsetY.value = clamped.y;
    })
    .onEnd(() => {
      savedOffsetX.value = offsetX.value;
      savedOffsetY.value = offsetY.value;
    });

  const ZOOM_CONFIG = { duration: 280, easing: Easing.out(Easing.cubic) };

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .maxDelay(300)
    .maxDuration(500)
    .onEnd((e) => {
      if (scale.value > 1.5) {
        scale.value = withTiming(1, ZOOM_CONFIG);
        offsetX.value = withTiming(0, ZOOM_CONFIG);
        offsetY.value = withTiming(0, ZOOM_CONFIG);
        savedScale.value = 1;
        savedOffsetX.value = 0;
        savedOffsetY.value = 0;
      } else {
        const newScale = 3;
        const fx = e.x - W / 2;
        const fy = e.y - H / 2;
        const clamped = clampOffset(-fx * (newScale - 1), -fy * (newScale - 1), newScale);
        scale.value = withTiming(newScale, ZOOM_CONFIG);
        offsetX.value = withTiming(clamped.x, ZOOM_CONFIG);
        offsetY.value = withTiming(clamped.y, ZOOM_CONFIG);
        savedScale.value = newScale;
        savedOffsetX.value = clamped.x;
        savedOffsetY.value = clamped.y;
      }
    });

  const gesture = Gesture.Race(
    doubleTap,
    Gesture.Simultaneous(pinchGesture, panGesture)
  );

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: offsetX.value },
      { translateY: offsetY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.Image
        source={{ uri }}
        style={[styles.fsImage, animStyle]}
        resizeMode="contain"
      />
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  fsImage: {
    width: "100%",
    height: "100%",
  },
});
