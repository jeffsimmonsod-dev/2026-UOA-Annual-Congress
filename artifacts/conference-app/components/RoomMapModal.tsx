import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  Dimensions,
  Image,
  Modal,
  Pressable,
  Text,
  View,
} from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import { Rect, Svg } from "react-native-svg";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getRoomColor } from "@/constants/roomColors";
import { DEFAULT_OVERLAYS, RoomOverlay } from "@/constants/defaultOverlays";
import { loadAllOverlays } from "@/hooks/useOverlays";

const SCREEN = Dimensions.get("window");

const FLOOR_PLANS_BASE = [
  {
    id: "lake",
    label: "Lake Level",
    source: require("@/assets/images/floorplan-lake-level.png"),
    nativeW: 1000,
    nativeH: 880,
    rooms: ["Deer Creek Ballroom", "Jordanelle Ballroom", "Strawberry Conference Room"],
  },
  {
    id: "mid",
    label: "Mid Mountain Level",
    source: require("@/assets/images/floorplan-mid-mountain.png"),
    nativeW: 530,
    nativeH: 589,
    rooms: ["Empire Conference Room", "Dutch Conference Room"],
  },
  {
    id: "main",
    label: "Main Level",
    source: require("@/assets/images/floorplan-main-level.png"),
    nativeW: 1163,
    nativeH: 767,
    rooms: ["Hailstone Terrace", "Remington Hall Restaurant"],
  },
];

function RoomOverlaysSvg({
  overlays,
  viewW,
  viewH,
  nativeW,
  nativeH,
  offsetX = 0,
  offsetY = 0,
  highlightRoom,
}: {
  overlays: RoomOverlay[];
  viewW: number;
  viewH: number;
  nativeW: number;
  nativeH: number;
  offsetX?: number;
  offsetY?: number;
  highlightRoom?: string;
}) {
  const hasHighlight = !!highlightRoom;
  return (
    <Svg
      style={{ position: "absolute", left: offsetX, top: offsetY }}
      width={viewW}
      height={viewH}
      viewBox={`0 0 ${nativeW} ${nativeH}`}
      pointerEvents="none"
    >
      {overlays.flatMap((overlay) => {
        const isHighlighted = hasHighlight && overlay.room === highlightRoom;
        const color = getRoomColor(overlay.room);
        return overlay.rects.map((r, i) => (
          <Rect
            key={`${overlay.room}-${i}`}
            x={r.x}
            y={r.y}
            width={r.w}
            height={r.h}
            fill={color}
            opacity={hasHighlight ? (isHighlighted ? 0.65 : 0.15) : 0.38}
            stroke={isHighlighted ? color : "none"}
            strokeWidth={isHighlighted ? 3 : 0}
            rx={6}
          />
        ));
      })}
    </Svg>
  );
}

function ZoomableImageWithOverlays({
  source,
  overlays,
  nativeW,
  nativeH,
  highlightRoom,
}: {
  source: ReturnType<typeof require>;
  overlays: RoomOverlay[];
  nativeW: number;
  nativeH: number;
  highlightRoom?: string;
}) {
  const W = SCREEN.width;
  const H = SCREEN.height * 0.78;

  const imgAspect = nativeW / nativeH;
  const screenAspect = W / H;
  let imgW: number, imgH: number, offX: number, offY: number;
  if (imgAspect > screenAspect) {
    imgW = W;
    imgH = W / imgAspect;
    offX = 0;
    offY = (H - imgH) / 2;
  } else {
    imgH = H;
    imgW = H * imgAspect;
    offX = (W - imgW) / 2;
    offY = 0;
  }

  const scale = useSharedValue(1);
  const offsetX = useSharedValue(0);
  const offsetY = useSharedValue(0);
  const savedScale = useSharedValue(1);
  const savedOffsetX = useSharedValue(0);
  const savedOffsetY = useSharedValue(0);

  const ANIM = { duration: 280, easing: Easing.out(Easing.cubic) };

  const resetToFit = () => {
    "worklet";
    scale.value = withTiming(1, ANIM);
    offsetX.value = withTiming(0, ANIM);
    offsetY.value = withTiming(0, ANIM);
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

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .maxDelay(300)
    .maxDuration(500)
    .onEnd((e) => {
      if (scale.value > 1.5) {
        scale.value = withTiming(1, ANIM);
        offsetX.value = withTiming(0, ANIM);
        offsetY.value = withTiming(0, ANIM);
        savedScale.value = 1;
        savedOffsetX.value = 0;
        savedOffsetY.value = 0;
      } else {
        const newScale = 3;
        const fx = e.x - W / 2;
        const fy = e.y - H / 2;
        const clamped = clampOffset(-fx * (newScale - 1), -fy * (newScale - 1), newScale);
        scale.value = withTiming(newScale, ANIM);
        offsetX.value = withTiming(clamped.x, ANIM);
        offsetY.value = withTiming(clamped.y, ANIM);
        savedScale.value = newScale;
        savedOffsetX.value = clamped.x;
        savedOffsetY.value = clamped.y;
      }
    });

  const gesture = Gesture.Race(doubleTap, Gesture.Simultaneous(pinchGesture, panGesture));

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: offsetX.value },
      { translateY: offsetY.value },
      { scale: scale.value },
    ],
  }), [offsetX, offsetY, scale]);

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[{ width: W, height: H, alignItems: "center", justifyContent: "center" }, animStyle]}>
        <Image source={source} style={{ width: W, height: H }} resizeMode="contain" />
        <RoomOverlaysSvg
          overlays={overlays}
          viewW={imgW}
          viewH={imgH}
          nativeW={nativeW}
          nativeH={nativeH}
          offsetX={offX}
          offsetY={offY}
          highlightRoom={highlightRoom}
        />
      </Animated.View>
    </GestureDetector>
  );
}

export default function RoomMapModal({
  room,
  visible,
  onClose,
}: {
  room: string;
  visible: boolean;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const roomColor = getRoomColor(room);

  const base = FLOOR_PLANS_BASE.find((p) => p.rooms.includes(room));
  const [overlays, setOverlays] = useState<RoomOverlay[]>(
    base ? DEFAULT_OVERLAYS[base.id]?.overlays ?? [] : []
  );

  useEffect(() => {
    if (!visible || !base) return;
    loadAllOverlays().then((all) => {
      const loaded = all[base.id]?.overlays;
      if (loaded) setOverlays(loaded);
    });
  }, [visible, base?.id]);

  if (!base) return null;

  const shortRoom = room
    .replace(" Conference Room", "")
    .replace(" Ballroom", "")
    .replace(" Restaurant", "");

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#000" }}>
        <ZoomableImageWithOverlays
          source={base.source}
          overlays={overlays}
          nativeW={base.nativeW}
          nativeH={base.nativeH}
          highlightRoom={room}
        />

        {/* Header */}
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            paddingTop: insets.top + 12,
            paddingHorizontal: 16,
            paddingBottom: 12,
            backgroundColor: "rgba(0,0,0,0.55)",
            flexDirection: "row",
            alignItems: "flex-start",
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ color: "#fff", fontSize: 17, fontWeight: "700" }}>
              {base.label}
            </Text>
            <Text style={{ color: "#ddd", fontSize: 13, marginTop: 1 }}>
              Pinch to zoom · Double-tap to reset
            </Text>
          </View>
          <Pressable
            onPress={onClose}
            hitSlop={16}
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: "rgba(255,255,255,0.18)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="close" size={20} color="#fff" />
          </Pressable>
        </View>

        {/* Room chip legend */}
        <View
          style={{
            position: "absolute",
            bottom: insets.bottom + 16,
            left: 0,
            right: 0,
            flexDirection: "row",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: 8,
            paddingHorizontal: 16,
          }}
        >
          {base.rooms.map((roomName) => {
            const rc = getRoomColor(roomName);
            const isHighlighted = roomName === room;
            const short = roomName
              .replace(" Conference Room", "")
              .replace(" Ballroom", "")
              .replace(" Restaurant", "");
            return (
              <View
                key={roomName}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 5,
                  borderRadius: 20,
                  backgroundColor: rc + "CC",
                  ...(isHighlighted ? { borderWidth: 2, borderColor: "#fff" } : {}),
                }}
              >
                <Text
                  style={{
                    color: "#fff",
                    fontSize: 12,
                    fontWeight: isHighlighted ? "800" : "600",
                  }}
                  numberOfLines={1}
                >
                  {short}
                </Text>
              </View>
            );
          })}
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}
