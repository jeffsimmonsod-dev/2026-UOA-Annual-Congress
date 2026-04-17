import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { BOOTH_NAMES } from "@/components/ExhibitHallMap";

const MAP_IMAGE = require("../assets/images/exhibit-hall-map.png");
// Actual pixel dimensions of exhibit-hall-map.png
const IMG_W = 1824;
const IMG_H = 2362;

// Booth tap zones in original image pixel coordinates (x, y, w, h)
// Each entry defines a tappable region over the corresponding booth
const BOOTH_ZONES: { id: string; x: number; y: number; w: number; h: number }[] = [
  // ── Foyer top row (98–112) ──────────────────────────────────────────────────
  { id:"98",  x:355, y:65,  w:132, h:205 }, { id:"99",  x:493, y:65,  w:132, h:205 },
  { id:"100", x:631, y:65,  w:132, h:205 }, { id:"102", x:769, y:65,  w:132, h:205 },
  { id:"104", x:905, y:65,  w:132, h:205 }, { id:"106", x:1041,y:65,  w:132, h:205 },
  { id:"108", x:1177,y:65,  w:132, h:205 }, { id:"110", x:1313,y:65,  w:132, h:205 },
  { id:"112", x:1449,y:65,  w:132, h:205 },
  // ── Foyer bottom row (101–111) ──────────────────────────────────────────────
  { id:"101", x:670, y:330, w:132, h:200 }, { id:"103", x:808, y:330, w:132, h:200 },
  { id:"105", x:946, y:330, w:132, h:200 }, { id:"107", x:1082,y:330, w:132, h:200 },
  { id:"109", x:1218,y:330, w:132, h:200 }, { id:"111", x:1354,y:330, w:132, h:200 },
  // ── Top ballroom row (202, 204, 206, 210) ──────────────────────────────────
  { id:"202", x:670, y:615, w:175, h:155 }, { id:"204", x:856, y:615, w:175, h:155 },
  { id:"206", x:1025,y:615, w:135, h:155 }, { id:"210", x:1255,y:615, w:175, h:155 },
  // ── Left wall ───────────────────────────────────────────────────────────────
  { id:"200", x:110, y:635, w:178, h:250 },
  { id:"300", x:110, y:1065,w:178, h:205 },
  { id:"400", x:110, y:1362,w:178, h:225 },
  { id:"500", x:110, y:1745,w:178, h:205 },
  // ── Narrow left (302, 401) ──────────────────────────────────────────────────
  { id:"302", x:295, y:1178,w:72,  h:150 },
  { id:"401", x:295, y:1505,w:72,  h:150 },
  // ── Right wall ──────────────────────────────────────────────────────────────
  { id:"212", x:1648,y:635, w:178, h:195 },
  { id:"314", x:1648,y:1050,w:178, h:155 },
  { id:"313", x:1648,y:1218,w:178, h:155 },
  { id:"414", x:1648,y:1400,w:178, h:155 },
  { id:"516", x:1648,y:1790,w:178, h:145 },
  { id:"515", x:1648,y:1965,w:178, h:145 },
  // ── Narrow right (315, 415) ─────────────────────────────────────────────────
  { id:"315", x:1570,y:1230,w:72,  h:130 },
  { id:"415", x:1570,y:1508,w:72,  h:130 },
  // ── Island row P1a (201, 203, 205, 207, 211) — measured: section y=790-935 ──
  { id:"201", x:595, y:790, w:155, h:145 }, { id:"203", x:757, y:790, w:155, h:145 },
  { id:"205", x:917, y:790, w:155, h:145 }, { id:"207", x:1077,y:790, w:155, h:145 },
  { id:"211", x:1317,y:790, w:155, h:145 },
  // ── Island row P1b (304, 306, 308, 310, 312) — measured: section y=935-1075 ─
  { id:"304", x:757, y:935, w:155, h:140 }, { id:"306", x:917, y:935, w:155, h:140 },
  { id:"308", x:1077,y:935, w:155, h:140 }, { id:"310", x:1240,y:935, w:155, h:140 },
  { id:"312", x:1402,y:935, w:155, h:140 },
  // ── Island row P2a (301, 303, 305, 307, 309, 311) — measured: y=1270-1410 ──
  { id:"301", x:575, y:1270,w:152, h:140 }, { id:"303", x:733, y:1270,w:152, h:140 },
  { id:"305", x:891, y:1270,w:152, h:140 }, { id:"307", x:1050,y:1270,w:152, h:140 },
  { id:"309", x:1210,y:1270,w:152, h:140 }, { id:"311", x:1370,y:1270,w:152, h:140 },
  // ── Island row P2b (402, 404, 406, 408, 410, 412) — measured: y=1410-1555 ──
  { id:"402", x:575, y:1410,w:152, h:145 }, { id:"404", x:733, y:1410,w:152, h:145 },
  { id:"406", x:891, y:1410,w:152, h:145 }, { id:"408", x:1050,y:1410,w:152, h:145 },
  { id:"410", x:1210,y:1410,w:152, h:145 }, { id:"412", x:1370,y:1410,w:152, h:145 },
  // ── Island row P3a (403, 405, 407, 409, 411) — measured: y=1745-1890 ────────
  { id:"403", x:733, y:1745,w:152, h:145 }, { id:"405", x:891, y:1745,w:152, h:145 },
  { id:"407", x:1050,y:1745,w:152, h:145 }, { id:"409", x:1210,y:1745,w:152, h:145 },
  { id:"411", x:1370,y:1745,w:152, h:145 },
  // ── Island row P3b (502, 504, 506, 508, 510, 512) — measured: y=1890-2040 ──
  { id:"502", x:575, y:1890,w:152, h:150 }, { id:"504", x:733, y:1890,w:152, h:150 },
  { id:"506", x:891, y:1890,w:152, h:150 }, { id:"508", x:1050,y:1890,w:152, h:150 },
  { id:"510", x:1210,y:1890,w:152, h:150 }, { id:"512", x:1370,y:1890,w:152, h:150 },
  // ── Bottom row (501–511) — measured: section y=2225-2355 ─────────────────────
  { id:"501", x:380, y:2225,w:140, h:130 }, { id:"503", x:528, y:2225,w:140, h:130 },
  { id:"505", x:678, y:2225,w:140, h:130 }, { id:"507", x:1000,y:2225,w:140, h:130 },
  { id:"509", x:1148,y:2225,w:140, h:130 }, { id:"511", x:1254,y:2225,w:140, h:130 },
  // ── Corner booths (513, 514) ─────────────────────────────────────────────────
  { id:"513", x:1562,y:2225,w:130, h:130 }, { id:"514", x:1698,y:2225,w:130, h:130 },
];

function ZoomableMap({ visitedBooths }: { visitedBooths: string[] }) {
  // Measure the actual rendered container so overlay pixels line up exactly
  const [containerW, setContainerW] = useState(0);
  const [containerH, setContainerH] = useState(0);

  const W = containerW;
  const H = containerH;

  // Derived layout — only valid once container has been measured
  const imgScale = W > 0 && H > 0 ? Math.min(W / IMG_W, H / IMG_H) : 0;
  const dispW  = IMG_W * imgScale;
  const dispH  = IMG_H * imgScale;
  const dispX0 = (W - dispW) / 2;
  const dispY0 = (H - dispH) / 2;

  // Shared values for pan bounds — updated from JS whenever layout changes
  const svW = useSharedValue(0);
  const svH = useSharedValue(0);

  const [selectedBooth, setSelectedBooth] = useState<string | null>(null);

  const scale      = useSharedValue(1);
  const offsetX    = useSharedValue(0);
  const offsetY    = useSharedValue(0);
  const savedScale = useSharedValue(1);
  const savedX     = useSharedValue(0);
  const savedY     = useSharedValue(0);

  const ZOOM_CFG = { duration: 260, easing: Easing.out(Easing.cubic) };

  const resetToFit = () => {
    "worklet";
    scale.value   = withSpring(1, { damping: 15 });
    offsetX.value = withSpring(0, { damping: 15 });
    offsetY.value = withSpring(0, { damping: 15 });
    savedScale.value = 1; savedX.value = 0; savedY.value = 0;
  };

  const clamp = (x: number, y: number, s: number) => {
    "worklet";
    const mx = Math.max(0, (svW.value * (s - 1)) / 2);
    const my = Math.max(0, (svH.value * (s - 1)) / 2);
    return { x: Math.min(mx, Math.max(-mx, x)), y: Math.min(my, Math.max(-my, y)) };
  };

  const pinch = Gesture.Pinch()
    .onBegin(() => {
      savedScale.value = scale.value;
      savedX.value = offsetX.value; savedY.value = offsetY.value;
    })
    .onUpdate((e) => {
      const ns = Math.min(6, Math.max(1, savedScale.value * e.scale));
      scale.value = ns;
      const fx = e.focalX - svW.value / 2, fy = e.focalY - svH.value / 2;
      const d  = ns / savedScale.value - 1;
      const c  = clamp(savedX.value - fx * d, savedY.value - fy * d, ns);
      offsetX.value = c.x; offsetY.value = c.y;
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      savedX.value = offsetX.value; savedY.value = offsetY.value;
      if (scale.value < 1.05) resetToFit();
    });

  const pan = Gesture.Pan()
    .averageTouches(true).minDistance(8)
    .onBegin(() => { savedX.value = offsetX.value; savedY.value = offsetY.value; })
    .onUpdate((e) => {
      if (scale.value <= 1.05) return;
      const c = clamp(savedX.value + e.translationX, savedY.value + e.translationY, scale.value);
      offsetX.value = c.x; offsetY.value = c.y;
    })
    .onEnd(() => { savedX.value = offsetX.value; savedY.value = offsetY.value; });

  const doubleTap = Gesture.Tap().numberOfTaps(2).maxDelay(300).maxDuration(500)
    .onEnd((e) => {
      if (scale.value > 1.5) {
        scale.value = withTiming(1, ZOOM_CFG);
        offsetX.value = withTiming(0, ZOOM_CFG);
        offsetY.value = withTiming(0, ZOOM_CFG);
        savedScale.value = 1; savedX.value = 0; savedY.value = 0;
      } else {
        const ns = 3;
        const fx = e.x - svW.value / 2, fy = e.y - svH.value / 2;
        const c = clamp(-fx * (ns - 1), -fy * (ns - 1), ns);
        scale.value = withTiming(ns, ZOOM_CFG);
        offsetX.value = withTiming(c.x, ZOOM_CFG);
        offsetY.value = withTiming(c.y, ZOOM_CFG);
        savedScale.value = ns; savedX.value = c.x; savedY.value = c.y;
      }
    });

  const gesture = Gesture.Race(doubleTap, Gesture.Simultaneous(pinch, pan));

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offsetX.value }, { translateY: offsetY.value }, { scale: scale.value }],
  }));

  const visited = new Set(visitedBooths.filter(Boolean));
  const selectedName = selectedBooth ? (BOOTH_NAMES[selectedBooth] ?? "") : "";

  return (
    <View
      style={{ flex: 1, overflow: "hidden" }}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        setContainerW(width);
        setContainerH(height);
        svW.value = width;
        svH.value = height;
      }}
    >
      {/* Only render once we have real dimensions */}
      {W > 0 && H > 0 && (
      <GestureDetector gesture={gesture}>
        <Animated.View style={[{ width: W, height: H }, animStyle]}>
          {/* Map image */}
          <Animated.Image
            source={MAP_IMAGE}
            style={{ width: W, height: H }}
            resizeMode="contain"
          />
          {/* Tap zones — positioned relative to the "contain"-fitted image area */}
          <View style={{
            position: "absolute",
            left: dispX0, top: dispY0,
            width: dispW, height: dispH,
          }}>
            {BOOTH_ZONES.map((z) => (
              <Pressable
                key={z.id}
                onPress={() => setSelectedBooth((prev) => prev === z.id ? null : z.id)}
                style={{
                  position: "absolute",
                  left:  z.x * imgScale,
                  top:   z.y * imgScale,
                  width: z.w * imgScale,
                  height:z.h * imgScale,
                  borderWidth: 1.5,
                  borderColor: "rgba(255,60,60,0.7)",
                  backgroundColor: "rgba(255,60,60,0.12)",
                }}
              >
                <Text style={{ fontSize: 6, color: "rgba(200,0,0,0.8)", fontWeight: "bold", lineHeight: 8 }}>{z.id}</Text>
              </Pressable>
            ))}
          </View>
        </Animated.View>
      </GestureDetector>
      )}


      {/* Booth tooltip */}
      {selectedBooth && (
        <Pressable
          onPress={() => setSelectedBooth(null)}
          style={styles.boothTooltip}
        >
          <View style={styles.boothTooltipInner}>
            <View style={styles.boothTooltipBadge}>
              <Text style={styles.boothTooltipNum}>Booth {selectedBooth}</Text>
            </View>
            <Text style={styles.boothTooltipName} numberOfLines={2}>
              {selectedName || "(no exhibitor assigned)"}
            </Text>
            {visited.has(selectedBooth) && (
              <Text style={styles.boothTooltipVisited}>✓ Visited</Text>
            )}
            <Text style={styles.boothTooltipDismiss}>Tap to dismiss</Text>
          </View>
        </Pressable>
      )}

      <Text style={styles.zoomHint}>Tap a booth · Pinch to zoom · Double-tap to zoom in/out</Text>
    </View>
  );
}

// Full exhibitor directory from CSV (booth number → full company name)
const EXHIBITOR_DIRECTORY: { booth: string; company: string }[] = [
  { booth: "300", company: "ADIT" },
  { booth: "312", company: "Alcon" },
  { booth: "206", company: "Apellis Pharmaceuticals" },
  { booth: "306", company: "Aseptikits" },
  { booth: "301", company: "Bausch+Lomb" },
  { booth: "400", company: "Blue River Medical, Inc" },
  { booth: "308", company: "Cherry Optical Lab" },
  { booth: "406", company: "Contamac" },
  { booth: "205", company: "Coopervision" },
  { booth: "200", company: "Dompé" },
  { booth: "108", company: "DSBVI" },
  { booth: "98",  company: "Edward Jones" },
  { booth: "407", company: "Essilor Instruments" },
  { booth: "403", company: "Essilor Labs of America" },
  { booth: "204", company: "EssilorLuxottica Eyecare" },
  { booth: "305", company: "Europa Eyewear" },
  { booth: "307", company: "Eyefficient/S4Optik" },
  { booth: "304", company: "Eye Designs LLC" },
  { booth: "112", company: "Friends for Sight" },
  { booth: "202", company: "Glaukos" },
  { booth: "515", company: "Hoopes Vision" },
  { booth: "110", company: "Hope Alliance" },
  { booth: "314", company: "IT4Eyes" },
  { booth: "211", company: "Johnson & Johnson" },
  { booth: "412", company: "Kering Eyewear" },
  { booth: "309", company: "L'Amy America" },
  { booth: "101", company: "Lenz Therapeutics" },
  { booth: "203", company: "LKC Technologies" },
  { booth: "405", company: "Luxottica Frames" },
  { booth: "414", company: "MacuHealth" },
  { booth: "302", company: "Medically USA" },
  { booth: "313", company: "Modern Optical" },
  { booth: "315", company: "MOREL Eyewear" },
  { booth: "310", company: "MyEyeDr" },
  { booth: "514", company: "Nikon Optical US" },
  { booth: "415", company: "Optos, Inc" },
  { booth: "411", company: "Optikam Tech Inc" },
  { booth: "512", company: "Optometric Aesthetics" },
  { booth: "402", company: "Orgreens Optics" },
  { booth: "311", company: "Premier Vision Lab" },
  { booth: "111", company: "Rawzi Eyewear" },
  { booth: "106", company: "Restoration Ophthalmics" },
  { booth: "210", company: "Rocky Mountain University" },
  { booth: "404", company: "Shamir Insights Inc" },
  { booth: "303", company: "Sun Pharma" },
  { booth: "503", company: "Teem" },
  { booth: "201", company: "The Eye Institute" },
  { booth: "500", company: "Topcon Healthcare" },
  { booth: "502", company: "Utah Eye Centers" },
  { booth: "103", company: "Visionix" },
  { booth: "207", company: "VSP" },
  { booth: "212", company: "Waite Vision" },
  { booth: "507", company: "ZEISS (507)" },
  { booth: "509", company: "ZEISS (509)" },
];

const SORTED_EXHIBITORS = [...EXHIBITOR_DIRECTORY].sort((a, b) =>
  a.company.localeCompare(b.company)
);

const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

function getDeviceId(): string {
  if (typeof globalThis.__deviceId === "string") return globalThis.__deviceId;
  const id = Math.random().toString(36).slice(2) + Date.now().toString(36);
  globalThis.__deviceId = id;
  return id;
}

interface Booth {
  id: number;
  name: string;
  company: string;
  booth_number: string | null;
  description: string | null;
  visit_count: number;
  visited: boolean;
}

interface PassportData {
  booths: Booth[];
  total: number;
  visitedCount: number;
  complete: boolean;
}

export default function ExhibitHallScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const deviceId = useRef(getDeviceId()).current;

  const [passport, setPassport] = useState<PassportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [scannerVisible, setScannerVisible] = useState(false);
  const [nameModalVisible, setNameModalVisible] = useState(false);
  const [attendeeName, setAttendeeName] = useState("");
  const [scanned, setScanned] = useState(false);
  const [pendingScan, setPendingScan] = useState<{ boothId: number; secretToken: string } | null>(null);
  const [checkingIn, setCheckingIn] = useState(false);

  const [permission, requestPermission] = useCameraPermissions();
  const [mapVisible, setMapVisible] = useState(false);
  const [mapTab, setMapTab] = useState<"map" | "directory">("map");

  // Build alphabetical sections for directory
  const directorySections = useMemo(() => {
    const grouped: Record<string, { booth: string; company: string }[]> = {};
    for (const item of SORTED_EXHIBITORS) {
      const letter = item.company[0].toUpperCase();
      if (!grouped[letter]) grouped[letter] = [];
      grouped[letter].push(item);
    }
    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([letter, data]) => ({ title: letter, data }));
  }, []);

  const fetchPassport = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/booths?deviceId=${encodeURIComponent(deviceId)}`);
      if (res.ok) setPassport(await res.json());
    } catch {}
    setLoading(false);
  }, [deviceId]);

  useEffect(() => { fetchPassport(); }, [fetchPassport]);

  const handleOpenScanner = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert("Camera permission needed", "Please allow camera access to scan booth QR codes.");
        return;
      }
    }
    setScanned(false);
    setScannerVisible(true);
  };

  const handleBarcodeScan = ({ data }: { data: string }) => {
    if (scanned) return;
    const prefix = "uoa2026:booth:";
    if (!data.startsWith(prefix)) {
      Alert.alert("Invalid QR Code", "This QR code is not a UOA booth code. Please scan a booth QR code.");
      return;
    }
    setScanned(true);
    const parts = data.slice(prefix.length).split(":");
    if (parts.length < 2) {
      Alert.alert("Invalid QR Code", "Malformed booth code.");
      return;
    }
    const boothId = parseInt(parts[0], 10);
    const secretToken = parts[1];
    setScannerVisible(false);
    setPendingScan({ boothId, secretToken });
    if (!attendeeName.trim()) {
      setNameModalVisible(true);
    } else {
      doCheckin(boothId, secretToken, attendeeName);
    }
  };

  const doCheckin = async (boothId: number, secretToken: string, name: string) => {
    setCheckingIn(true);
    try {
      const res = await fetch(`${API_BASE}/api/booths/checkin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ boothId, secretToken, deviceId, attendeeName: name }),
      });
      const data = await res.json();
      if (!res.ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert("Check-in failed", data.error || "Something went wrong.");
      } else if (data.alreadyVisited) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        Alert.alert("Already visited!", `You already checked in at ${data.booth.name}.`);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await fetchPassport();
        const newVisited = (passport?.visitedCount ?? 0) + 1;
        const total = passport?.total ?? 0;
        if (total > 0 && newVisited === total) {
          Alert.alert("🎉 Passport Complete!", "You've visited all booths! Find a UOA staff member to enter the raffle.");
        } else {
          Alert.alert("✓ Checked in!", `Welcome to ${data.booth.name} (${data.booth.company})!`);
        }
      }
    } catch {
      Alert.alert("Error", "Could not connect to server. Please try again.");
    }
    setCheckingIn(false);
    setPendingScan(null);
  };

  const handleNameSubmit = () => {
    setNameModalVisible(false);
    if (pendingScan) {
      doCheckin(pendingScan.boothId, pendingScan.secretToken, attendeeName);
    }
  };

  const booths = passport?.booths ?? [];
  const visited = passport?.visitedCount ?? 0;
  const total = passport?.total ?? 0;
  const complete = passport?.complete ?? false;
  const progress = total > 0 ? visited / total : 0;

  const visitedBoothNumbers = booths
    .filter((b) => b.visited && b.booth_number)
    .map((b) => b.booth_number as string);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Exhibit Hall</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 120 }]} showsVerticalScrollIndicator={false}>

          {complete && (
            <View style={[styles.completeBanner, { backgroundColor: "#10b98120", borderColor: "#10b981" }]}>
              <Ionicons name="trophy" size={28} color="#10b981" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.completeTitle, { color: "#10b981" }]}>Passport Complete! 🎉</Text>
                <Text style={[styles.completeSubtitle, { color: colors.mutedForeground }]}>Find a UOA staff member to enter the raffle.</Text>
              </View>
            </View>
          )}

          <View style={[styles.passportCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.passportHeader}>
              <View>
                <Text style={[styles.passportTitle, { color: colors.foreground }]}>Your Passport</Text>
                <Text style={[styles.passportSubtitle, { color: colors.mutedForeground }]}>
                  {total === 0 ? "No booths set up yet" : `${visited} of ${total} booths visited`}
                </Text>
              </View>
              <View style={[styles.badge, { backgroundColor: complete ? "#10b981" : colors.primary }]}>
                <Text style={styles.badgeText}>{visited}/{total}</Text>
              </View>
            </View>
            {total > 0 && (
              <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: complete ? "#10b981" : colors.primary }]} />
              </View>
            )}
          </View>

          <View style={styles.actionRow}>
            <Pressable
              onPress={handleOpenScanner}
              style={({ pressed }) => [styles.scanBtn, { flex: 1, backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
            >
              <Ionicons name="qr-code-outline" size={22} color="#fff" />
              <Text style={styles.scanBtnText}>Scan QR Code</Text>
            </Pressable>
            <Pressable
              onPress={() => { setMapTab("map"); setMapVisible(true); }}
              style={({ pressed }) => [
                styles.mapBtn,
                { backgroundColor: colors.card, borderColor: colors.primary, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Ionicons name="map-outline" size={20} color={colors.primary} />
              <Text style={[styles.mapBtnText, { color: colors.primary }]}>Map & Directory</Text>
            </Pressable>
          </View>

          {total === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="storefront-outline" size={40} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                Booths will appear here once the exhibit hall is set up.
              </Text>
            </View>
          ) : (
            <View style={[styles.boothList, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.listTitle, { color: colors.foreground }]}>Booth Checklist</Text>
              {booths.map((booth, i) => (
                <View
                  key={booth.id}
                  style={[
                    styles.boothRow,
                    i < booths.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
                  ]}
                >
                  <View style={[styles.boothCheck, { backgroundColor: booth.visited ? "#10b98120" : colors.muted, borderColor: booth.visited ? "#10b981" : colors.border }]}>
                    {booth.visited ? (
                      <Ionicons name="checkmark" size={16} color="#10b981" />
                    ) : (
                      <View style={[styles.emptyCheck, { borderColor: colors.border }]} />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.boothName, { color: colors.foreground }]}>
                      {booth.booth_number ? `#${booth.booth_number} · ` : ""}{booth.company}
                    </Text>
                    <Text style={[styles.boothCompany, { color: colors.mutedForeground }]}>{booth.name}</Text>
                  </View>
                  {booth.visited && (
                    <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                  )}
                </View>
              ))}
            </View>
          )}

          <View style={[styles.infoCard, { backgroundColor: colors.accent, borderColor: colors.border }]}>
            <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
            <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
              Scan the QR code at each exhibitor booth to mark it visited. Complete all booths to enter the raffle!
            </Text>
          </View>
        </ScrollView>
      )}

      {checkingIn && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.overlayText}>Checking in...</Text>
        </View>
      )}

      <Modal visible={mapVisible} animationType="slide" onRequestClose={() => setMapVisible(false)}>
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          {/* Map modal header */}
          <View style={[styles.mapModalHeader, { paddingTop: insets.top + 12, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
            <Pressable onPress={() => setMapVisible(false)} style={styles.backBtn}>
              <Ionicons name="close" size={26} color={colors.primary} />
            </Pressable>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>Exhibit Hall</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Tabs: Map | Directory */}
          <View style={[styles.mapTabBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
            {(["map", "directory"] as const).map((tab) => (
              <Pressable
                key={tab}
                onPress={() => setMapTab(tab)}
                style={[styles.mapTabItem, mapTab === tab && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
              >
                <Ionicons
                  name={tab === "map" ? "map-outline" : "list-outline"}
                  size={16}
                  color={mapTab === tab ? colors.primary : colors.mutedForeground}
                />
                <Text style={[styles.mapTabLabel, { color: mapTab === tab ? colors.primary : colors.mutedForeground }]}>
                  {tab === "map" ? "Floor Map" : "Directory"}
                </Text>
              </Pressable>
            ))}
          </View>

          {mapTab === "map" ? (
            <GestureHandlerRootView style={{ flex: 1 }}>
              <ZoomableMap visitedBooths={visitedBoothNumbers} />
            </GestureHandlerRootView>
          ) : (
            <SectionList
              sections={directorySections}
              keyExtractor={(item) => item.booth}
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
              stickySectionHeadersEnabled
              renderSectionHeader={({ section: { title } }) => (
                <View style={[styles.dirSectionHeader, { backgroundColor: colors.muted, borderBottomColor: colors.border }]}>
                  <Text style={[styles.dirSectionLetter, { color: colors.primary }]}>{title}</Text>
                </View>
              )}
              renderItem={({ item, index, section }) => (
                <View
                  style={[
                    styles.dirRow,
                    {
                      backgroundColor: colors.card,
                      borderBottomColor: colors.border,
                      borderBottomWidth: index < section.data.length - 1 ? StyleSheet.hairlineWidth : 0,
                    },
                  ]}
                >
                  <View style={[styles.dirBoothBadge, { backgroundColor: colors.primary + "18", borderColor: colors.primary + "40" }]}>
                    <Text style={[styles.dirBoothNum, { color: colors.primary }]}>{item.booth}</Text>
                  </View>
                  <Text style={[styles.dirCompany, { color: colors.foreground }]}>{item.company}</Text>
                </View>
              )}
            />
          )}
        </View>
      </Modal>

      <Modal visible={scannerVisible} animationType="slide" onRequestClose={() => setScannerVisible(false)}>
        <View style={{ flex: 1, backgroundColor: "#000" }}>
          <View style={[styles.scannerHeader, { paddingTop: insets.top + 12 }]}>
            <Pressable onPress={() => setScannerVisible(false)} style={styles.closeScannerBtn}>
              <Ionicons name="close" size={28} color="#fff" />
            </Pressable>
            <Text style={styles.scannerTitle}>Scan Booth QR Code</Text>
            <View style={{ width: 40 }} />
          </View>

          {permission?.granted ? (
            <CameraView
              style={{ flex: 1 }}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
              onBarcodeScanned={scanned ? undefined : handleBarcodeScan}
            />
          ) : (
            <View style={styles.center}>
              <Text style={{ color: "#fff" }}>Camera permission required</Text>
            </View>
          )}

          <View style={styles.scannerOverlay}>
            <View style={styles.scanFrame} />
            <Text style={styles.scannerHint}>Point your camera at the QR code at the booth</Text>
          </View>
        </View>
      </Modal>

      <Modal visible={nameModalVisible} transparent animationType="fade" onRequestClose={() => setNameModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.modalBackdrop}>
          <View style={[styles.nameModal, { backgroundColor: colors.card }]}>
            <Text style={[styles.nameModalTitle, { color: colors.foreground }]}>Enter Your Name</Text>
            <Text style={[styles.nameModalSubtitle, { color: colors.mutedForeground }]}>
              So we can identify you for the raffle
            </Text>
            <TextInput
              style={[styles.nameInput, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
              placeholder="Your full name"
              placeholderTextColor={colors.mutedForeground}
              value={attendeeName}
              onChangeText={setAttendeeName}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleNameSubmit}
            />
            <Pressable
              onPress={handleNameSubmit}
              style={({ pressed }) => [styles.nameSubmitBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
            >
              <Text style={styles.nameSubmitText}>Check In</Text>
            </Pressable>
            <Pressable onPress={() => { setNameModalVisible(false); if (pendingScan) doCheckin(pendingScan.boothId, pendingScan.secretToken, ""); }}>
              <Text style={[styles.skipText, { color: colors.mutedForeground }]}>Skip (no name)</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 40, alignItems: "flex-start" },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: "700", textAlign: "center" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: 16, gap: 12 },
  completeBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  completeTitle: { fontSize: 16, fontWeight: "700" },
  completeSubtitle: { fontSize: 13, marginTop: 2 },
  passportCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  passportHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  passportTitle: { fontSize: 17, fontWeight: "700" },
  passportSubtitle: { fontSize: 13, marginTop: 2 },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  progressBar: { height: 8, borderRadius: 4, overflow: "hidden" },
  progressFill: { height: 8, borderRadius: 4 },
  scanBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
  },
  scanBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  emptyCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 32,
    alignItems: "center",
    gap: 12,
  },
  emptyText: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  boothList: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    padding: 16,
    gap: 4,
  },
  listTitle: { fontSize: 15, fontWeight: "700", marginBottom: 8 },
  boothRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
  },
  boothCheck: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyCheck: { width: 14, height: 14, borderRadius: 4, borderWidth: 1.5 },
  boothName: { fontSize: 14, fontWeight: "600" },
  boothCompany: { fontSize: 12, marginTop: 1 },
  infoCard: {
    flexDirection: "row",
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "flex-start",
  },
  infoText: { flex: 1, fontSize: 13, lineHeight: 18 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#00000088",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  overlayText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  scannerHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: "#000",
  },
  closeScannerBtn: { width: 40, alignItems: "flex-start" },
  scannerTitle: { flex: 1, color: "#fff", fontSize: 17, fontWeight: "700", textAlign: "center" },
  scannerOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    paddingBottom: 60,
    gap: 24,
  },
  scanFrame: {
    width: 220,
    height: 220,
    borderWidth: 3,
    borderColor: "#fff",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  scannerHint: { color: "#ffffffcc", fontSize: 14, textAlign: "center", paddingHorizontal: 40 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "#00000060",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  nameModal: {
    width: "100%",
    borderRadius: 20,
    padding: 24,
    gap: 12,
    alignItems: "center",
  },
  nameModalTitle: { fontSize: 18, fontWeight: "700" },
  nameModalSubtitle: { fontSize: 14, textAlign: "center" },
  nameInput: {
    width: "100%",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 16,
    marginTop: 4,
  },
  nameSubmitBtn: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  nameSubmitText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  skipText: { fontSize: 13, marginTop: 4 },
  actionRow: {
    flexDirection: "row",
    gap: 10,
  },
  mapBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  mapBtnText: { fontSize: 14, fontWeight: "700" },
  mapModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  zoomHint: {
    textAlign: "center",
    fontSize: 11,
    color: "#94a3b8",
    paddingVertical: 6,
  },
  boothTooltip: {
    position: "absolute",
    bottom: 32,
    left: 16,
    right: 16,
    alignItems: "center",
  },
  boothTooltipInner: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 12,
    alignItems: "center",
    gap: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 10,
    minWidth: 200,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  boothTooltipBadge: {
    backgroundColor: "#4f46e5",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  boothTooltipNum: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  boothTooltipName: {
    color: "#1e293b",
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 2,
  },
  boothTooltipVisited: {
    color: "#059669",
    fontSize: 12,
    fontWeight: "700",
  },
  boothTooltipDismiss: {
    color: "#94a3b8",
    fontSize: 11,
    marginTop: 2,
  },
  mapTabBar: {
    flexDirection: "row",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  mapTabItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  mapTabLabel: { fontSize: 13, fontWeight: "600" },
  dirSectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dirSectionLetter: { fontSize: 13, fontWeight: "700" },
  dirRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 14,
  },
  dirBoothBadge: {
    minWidth: 44,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
  },
  dirBoothNum: { fontSize: 12, fontWeight: "700" },
  dirCompany: { fontSize: 15, fontWeight: "500", flex: 1 },
});
