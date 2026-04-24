/**
 * Floor Plan Overlay Calibration Tool
 *
 * Long-press a floor plan on the Venue screen to open this.
 * Drag boxes to reposition, drag the ◢ corner handle to resize.
 * Fine-tune with the ±5 nudge buttons below.
 * Copy the output and paste it into venue.tsx LAKE_OVERLAYS / MID_OVERLAYS.
 */
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getRoomColor } from "@/constants/roomColors";
import { loadPlanOverlays, saveOverlaysForPlan, resetPlanOverlays } from "@/hooks/useOverlays";

const SCREEN = Dimensions.get("window");

// ─── Mirror of venue.tsx overlay data ────────────────────────────────────────
interface Rect { x: number; y: number; w: number; h: number }
interface Overlay { room: string; rects: Rect[] }

const INITIAL_OVERLAYS: Record<string, { nativeW: number; nativeH: number; overlays: Overlay[] }> = {
  lake: {
    nativeW: 1000,
    nativeH: 880,
    overlays: [
      { room: "Deer Creek Ballroom",       rects: [{ x: 70,  y: 235, w: 232, h: 190 }, { x: 70,  y: 425, w: 232, h: 275 }] },
      { room: "Jordanelle Ballroom",        rects: [{ x: 370, y: 360, w: 310, h: 475 }] },
      { room: "Strawberry Conference Room", rects: [{ x: 718, y: 235, w: 252, h: 140 }] },
    ],
  },
  mid: {
    nativeW: 530,
    nativeH: 589,
    overlays: [
      { room: "Empire Conference Room", rects: [{ x: 78,  y: 28,  w: 192, h: 150 }] },
      { room: "Dutch Conference Room",  rects: [{ x: 370, y: 413, w: 128, h: 115 }] },
    ],
  },
  main: {
    nativeW: 1163,
    nativeH: 767,
    overlays: [
      { room: "Hailstone Terrace",        rects: [{ x: 120, y: 75, w: 255, h: 245 }] },
      { room: "Remington Hall Restaurant", rects: [{ x: 440, y: 10, w: 178, h: 310 }] },
    ],
  },
};

const SOURCES: Record<string, ReturnType<typeof require>> = {
  lake: require("@/assets/images/floorplan-lake-level.png"),
  mid:  require("@/assets/images/floorplan-mid-mountain.png"),
  main: require("@/assets/images/floorplan-main-level.png"),
};

// ─── Flat list item for editing ──────────────────────────────────────────────
interface FlatRect { room: string; rectIdx: number; x: number; y: number; w: number; h: number }

function flattenOverlays(overlays: Overlay[]): FlatRect[] {
  const out: FlatRect[] = [];
  for (const o of overlays) {
    o.rects.forEach((r, i) => out.push({ room: o.room, rectIdx: i, ...r }));
  }
  return out;
}

function rebuildOverlays(flat: FlatRect[]): Overlay[] {
  const map: Record<string, Rect[]> = {};
  for (const f of flat) {
    if (!map[f.room]) map[f.room] = [];
    map[f.room][f.rectIdx] = { x: f.x, y: f.y, w: f.w, h: f.h };
  }
  return Object.entries(map).map(([room, rects]) => ({ room, rects }));
}

// ─── Draggable/resizable overlay box ─────────────────────────────────────────
function OverlayBox({
  item,
  scale,
  isSelected,
  onSelect,
  onMoveEnd,
  onResizeEnd,
}: {
  item: FlatRect;
  scale: number;
  isSelected: boolean;
  onSelect: () => void;
  onMoveEnd: (dx: number, dy: number) => void;
  onResizeEnd: (dw: number, dh: number) => void;
}) {
  const color = getRoomColor(item.room);

  // Shared animated deltas (reset each gesture)
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const dw = useSharedValue(0);
  const dh = useSharedValue(0);

  const boxStyle = useAnimatedStyle(() => ({
    left:   item.x * scale + tx.value,
    top:    item.y * scale + ty.value,
    width:  item.w * scale + dw.value,
    height: item.h * scale + dh.value,
  }));

  const moveGesture = Gesture.Pan()
    .onBegin(() => { runOnJS(onSelect)(); })
    .onUpdate((e) => { tx.value = e.translationX; ty.value = e.translationY; })
    .onEnd((e) => {
      const dx = Math.round(e.translationX / scale);
      const dy = Math.round(e.translationY / scale);
      tx.value = 0; ty.value = 0;
      runOnJS(onMoveEnd)(dx, dy);
    });

  const resizeGesture = Gesture.Pan()
    .onUpdate((e) => { dw.value = e.translationX; dh.value = e.translationY; })
    .onEnd((e) => {
      const rdw = Math.round(e.translationX / scale);
      const rdh = Math.round(e.translationY / scale);
      dw.value = 0; dh.value = 0;
      runOnJS(onResizeEnd)(rdw, rdh);
    });

  return (
    <GestureDetector gesture={moveGesture}>
      <Animated.View
        style={[
          styles.overlayBox,
          boxStyle,
          {
            backgroundColor: color + "44",
            borderColor: isSelected ? "#fff" : color,
            borderWidth: isSelected ? 2 : 1.5,
          },
        ]}
      >
        {/* Coord label */}
        {isSelected && (
          <Text style={styles.coordLabel}>
            {`${item.x},${item.y}  ${item.w}×${item.h}`}
          </Text>
        )}
        {/* Resize handle — bottom-right corner */}
        <GestureDetector gesture={resizeGesture}>
          <View
            style={[
              styles.resizeHandle,
              { backgroundColor: isSelected ? "#fff" : color + "99" },
            ]}
          >
            <Text style={{ fontSize: 10, color: isSelected ? "#000" : "#fff" }}>◢</Text>
          </View>
        </GestureDetector>
      </Animated.View>
    </GestureDetector>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────
export default function CalibrateOverlaysScreen() {
  const { planId } = useLocalSearchParams<{ planId: string }>();
  const insets = useSafeAreaInsets();
  const id = planId ?? "lake";

  const planMeta = INITIAL_OVERLAYS[id] ?? INITIAL_OVERLAYS.lake;
  const [rects, setRects] = useState<FlatRect[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Load from storage on mount (reflects any previously saved adjustments)
  useEffect(() => {
    loadPlanOverlays(id).then((data) => {
      setRects(flattenOverlays(data.overlays));
    });
  }, [id]);

  const displayW = SCREEN.width;
  const displayH = (planMeta.nativeH / planMeta.nativeW) * displayW;
  const scale = displayW / planMeta.nativeW;

  const selectedFlat = rects.find((r) => `${r.room}-${r.rectIdx}` === selectedKey) ?? null;

  const updateRect = (key: string, patch: Partial<Rect>) => {
    setRects((prev) =>
      prev.map((r) =>
        `${r.room}-${r.rectIdx}` === key ? { ...r, ...patch } : r
      )
    );
  };

  const nudge = (field: keyof Rect, delta: number) => {
    if (!selectedKey) return;
    setRects((prev) =>
      prev.map((r) =>
        `${r.room}-${r.rectIdx}` === selectedKey
          ? { ...r, [field]: Math.round(r[field] + delta) }
          : r
      )
    );
  };

  const handleSave = async () => {
    setSaving(true);
    await saveOverlaysForPlan(id, rebuildOverlays(rects));
    setSaving(false);
    router.back();
  };

  const handleReset = () => {
    Alert.alert("Reset to Defaults", "Discard your changes and restore the original positions?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Reset",
        style: "destructive",
        onPress: async () => {
          await resetPlanOverlays(id);
          setRects(flattenOverlays((INITIAL_OVERLAYS[id] ?? INITIAL_OVERLAYS.lake).overlays));
        },
      },
    ]);
  };

  const outputCode = useMemo(() => {
    const overlays = rebuildOverlays(rects);
    const lines = overlays.map((o) => {
      const rectsStr = o.rects
        .map((r) => `{ x: ${r.x}, y: ${r.y}, w: ${r.w}, h: ${r.h} }`)
        .join(",\n        ");
      return `  {\n    room: "${o.room}",\n    rects: [\n        ${rectsStr},\n    ],\n  }`;
    });
    const label = id === "lake" ? "LAKE" : id === "mid" ? "MID" : "MAIN";
    return `// ${label}_OVERLAYS\n[\n${lines.join(",\n")}\n]`;
  }, [rects, id]);

  const copyOutput = async () => {
    try {
      await Share.share({ message: outputCode, title: "Overlay Coordinates" });
    } catch {
      Alert.alert("Output", outputCode);
    }
  };

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#111" }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        scrollEnabled={selectedKey === null}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>
            {id === "lake" ? "Lake Level" : id === "mid" ? "Mid Mountain" : "Main Level"} Overlays
          </Text>
          <Pressable onPress={handleReset} hitSlop={8} style={styles.resetBtn}>
            <Text style={styles.resetBtnText}>Reset</Text>
          </Pressable>
        </View>

        {/* Save bar */}
        <Pressable
          onPress={handleSave}
          disabled={saving}
          style={({ pressed }) => [
            styles.saveBar,
            { opacity: saving || pressed ? 0.7 : 1 },
          ]}
        >
          <Ionicons name="checkmark-circle" size={18} color="#fff" />
          <Text style={styles.saveBarText}>
            {saving ? "Saving…" : "Save & Apply to Map"}
          </Text>
        </Pressable>

        <Text style={styles.hint}>
          Tap a box to select · Drag to move · Drag ◢ to resize · Use nudge buttons to fine-tune
        </Text>

        {/* Floor plan + overlays */}
        <View style={{ width: displayW, height: displayH }}>
          <Image
            source={SOURCES[id]}
            style={{ width: displayW, height: displayH }}
            resizeMode="stretch"
          />
          {rects.map((item) => {
            const key = `${item.room}-${item.rectIdx}`;
            return (
              <OverlayBox
                key={key}
                item={item}
                scale={scale}
                isSelected={selectedKey === key}
                onSelect={() => setSelectedKey(key)}
                onMoveEnd={(dx, dy) =>
                  updateRect(key, { x: item.x + dx, y: item.y + dy })
                }
                onResizeEnd={(dw, dh) =>
                  updateRect(key, { w: Math.max(20, item.w + dw), h: Math.max(20, item.h + dh) })
                }
              />
            );
          })}
        </View>

        {/* Nudge panel */}
        {selectedFlat && (
          <View style={styles.nudgePanel}>
            <Text style={styles.nudgePanelTitle}>
              {selectedFlat.room}{selectedFlat.rectIdx > 0 ? ` (rect ${selectedFlat.rectIdx + 1})` : ""}
            </Text>
            <View style={styles.nudgeGrid}>
              {(["x", "y", "w", "h"] as (keyof Rect)[]).map((field) => (
                <View key={field} style={styles.nudgeRow}>
                  <Text style={styles.nudgeField}>{field}</Text>
                  <Text style={styles.nudgeValue}>{selectedFlat[field]}</Text>
                  {[-5, -1, 1, 5].map((d) => (
                    <Pressable
                      key={d}
                      onPress={() => nudge(field, d)}
                      style={({ pressed }) => [styles.nudgeBtn, { opacity: pressed ? 0.6 : 1 }]}
                    >
                      <Text style={styles.nudgeBtnText}>{d > 0 ? `+${d}` : d}</Text>
                    </Pressable>
                  ))}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Output */}
        <View style={styles.outputSection}>
          <View style={styles.outputHeader}>
            <Text style={styles.outputTitle}>Output (paste into venue.tsx)</Text>
            <Pressable
              onPress={copyOutput}
              style={({ pressed }) => [styles.copyBtn, { opacity: pressed ? 0.7 : 1 }]}
            >
              <Ionicons name="copy-outline" size={14} color="#fff" />
              <Text style={styles.copyBtnText}>Copy</Text>
            </Pressable>
          </View>
          <Text selectable style={styles.outputCode}>
            {outputCode}
          </Text>
        </View>
      </ScrollView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingBottom: 10,
    gap: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { color: "#fff", fontSize: 15, fontWeight: "700", flex: 1 },
  resetBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  resetBtnText: { color: "rgba(255,100,100,0.9)", fontSize: 13, fontWeight: "600" },
  saveBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: 14,
    marginBottom: 8,
    backgroundColor: "#16a34a",
    borderRadius: 14,
    paddingVertical: 13,
  },
  saveBarText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  hint: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 11,
    textAlign: "center",
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  // Overlay boxes
  overlayBox: {
    position: "absolute",
    borderRadius: 6,
    overflow: "hidden",
  },
  coordLabel: {
    position: "absolute",
    top: 3,
    left: 4,
    color: "#fff",
    fontSize: 9,
    fontWeight: "700",
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 3,
    paddingHorizontal: 3,
    paddingVertical: 1,
  },
  resizeHandle: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 22,
    height: 22,
    borderTopLeftRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  // Nudge panel
  nudgePanel: {
    margin: 14,
    backgroundColor: "#1e1e1e",
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  nudgePanelTitle: { color: "#fff", fontWeight: "700", fontSize: 13 },
  nudgeGrid: { gap: 8 },
  nudgeRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  nudgeField: {
    color: "#aaa",
    fontSize: 12,
    fontWeight: "700",
    width: 14,
    fontFamily: "monospace",
  },
  nudgeValue: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
    width: 46,
    fontFamily: "monospace",
    textAlign: "right",
  },
  nudgeBtn: {
    flex: 1,
    backgroundColor: "#333",
    borderRadius: 8,
    paddingVertical: 6,
    alignItems: "center",
  },
  nudgeBtnText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  // Output section
  outputSection: {
    margin: 14,
    backgroundColor: "#0f1117",
    borderRadius: 14,
    overflow: "hidden",
  },
  outputHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#222",
  },
  outputTitle: { color: "#aaa", fontSize: 12, fontWeight: "600" },
  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#2563eb",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  copyBtnText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  outputCode: {
    color: "#7dd3fc",
    fontSize: 10.5,
    fontFamily: "monospace",
    padding: 14,
    lineHeight: 17,
  },
});
