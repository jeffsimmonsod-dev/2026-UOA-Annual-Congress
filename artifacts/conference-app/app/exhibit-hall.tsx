import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
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
import { useProfile } from "@/context/ProfileContext";
import event from "@event";
import conferenceConfig from "@/conference.config";
import { apiFetch } from "@/services/apiFetch";

// Exhibit hall map, booth zones and directory come from the event folder.
// This screen is only reachable when the event has an exhibit hall configured.
const EXHIBIT_HALL = event.content.exhibitHall ?? {
  mapImage: 0,
  mapWidth: 1,
  mapHeight: 1,
  boothZones: [],
  boothNames: {},
  directory: [],
};
const MAP_IMAGE = EXHIBIT_HALL.mapImage;
const IMG_W = EXHIBIT_HALL.mapWidth;
const IMG_H = EXHIBIT_HALL.mapHeight;
const BOOTH_ZONES = EXHIBIT_HALL.boothZones;
const BOOTH_NAMES = EXHIBIT_HALL.boothNames;
const EXHIBITOR_DIRECTORY = EXHIBIT_HALL.directory;


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
  }), [offsetX, offsetY, scale]);

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
                }}
              />
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


const SORTED_EXHIBITORS = [...EXHIBITOR_DIRECTORY].sort((a, b) =>
  a.company.localeCompare(b.company)
);

const API_BASE = conferenceConfig.apiBaseUrl || `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

const CONF_NS = `@${conferenceConfig.conferenceId}`;
const ATTENDEE_TOKEN_KEY = `${CONF_NS}/attendeeToken`;
const PASSPORT_CACHE_KEY  = `${CONF_NS}/passportCache`;
const PENDING_CHECKINS_KEY = `${CONF_NS}/pendingCheckins`;

interface PendingCheckin {
  boothId: number;
  secretToken: string;
  name: string;
  email: string;
}

async function getOrCreateAttendeeToken(): Promise<string> {
  try {
    const stored = await AsyncStorage.getItem(ATTENDEE_TOKEN_KEY);
    if (stored) return stored;
  } catch {}
  try {
    const res = await apiFetch(`${API_BASE}/api/attendees/register`, { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      const token: string = data.attendeeToken;
      await AsyncStorage.setItem(ATTENDEE_TOKEN_KEY, token);
      return token;
    }
  } catch {}
  return "";
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

function formatRelativeTime(ts: number): string {
  const diffMs = Date.now() - ts;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  return `${Math.floor(diffHrs / 24)}d ago`;
}

export default function ExhibitHallScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile } = useProfile();
  const [attendeeToken, setAttendeeToken] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState(false);
  const params = useLocalSearchParams<{ scan?: string }>();

  const [passport, setPassport] = useState<PassportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [scannerVisible, setScannerVisible] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [cacheTimestamp, setCacheTimestamp] = useState<number | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

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

  useEffect(() => {
    getOrCreateAttendeeToken().then((t) => {
      if (t) {
        setAttendeeToken(t);
      } else {
        setTokenError(true);
        setLoading(false);
      }
    });
  }, []);

  // Flush any queued offline check-ins. Returns how many remain after flushing.
  const flushPendingQueue = useCallback(async (token: string, emailConsent: boolean): Promise<number> => {
    try {
      const stored = await AsyncStorage.getItem(PENDING_CHECKINS_KEY);
      if (!stored) return 0;
      const pending: PendingCheckin[] = JSON.parse(stored);
      if (pending.length === 0) return 0;

      setSyncing(true);
      const remaining: PendingCheckin[] = [];

      for (const checkin of pending) {
        try {
          const res = await apiFetch(`${API_BASE}/api/booths/checkin`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              boothId: checkin.boothId,
              secretToken: checkin.secretToken,
              attendeeToken: token,
              attendeeName: checkin.name,
              attendeeEmail: checkin.email || undefined,
              emailConsent,
            }),
          });
          // If already visited that's fine — don't re-queue it
          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            // Permanent rejections (bad/expired code, unknown booth) are dropped;
            // rate limits (429) and server errors are retried on the next sync.
            const permanent = res.status === 400 || res.status === 403 || res.status === 404;
            if (!body.alreadyVisited && !permanent) remaining.push(checkin);
          }
        } catch {
          remaining.push(checkin);
        }
      }

      await AsyncStorage.setItem(PENDING_CHECKINS_KEY, JSON.stringify(remaining));
      setSyncing(false);
      return remaining.length;
    } catch {
      setSyncing(false);
      return 0;
    }
  }, []);

  const fetchPassport = useCallback(async () => {
    if (!attendeeToken) {
      setLoading(false);
      return;
    }
    // Flush any offline-queued check-ins before fetching so the server state is current
    const remainingPending = await flushPendingQueue(attendeeToken, profile?.emailConsent ?? false);
    setPendingCount(remainingPending);
    try {
      const res = await apiFetch(`${API_BASE}/api/booths?attendeeToken=${encodeURIComponent(attendeeToken)}`);
      if (res.ok) {
        const data: PassportData = await res.json();
        setPassport(data);
        setIsOffline(false);
        setCacheTimestamp(null);
        // Cache the fresh result for offline use
        await AsyncStorage.setItem(PASSPORT_CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
      }
    } catch {
      // Network failed — try the local cache
      try {
        const cached = await AsyncStorage.getItem(PASSPORT_CACHE_KEY);
        if (cached) {
          const { data, ts }: { data: PassportData; ts: number } = JSON.parse(cached);
          setPassport(data);
          setCacheTimestamp(ts);
          setIsOffline(true);
        }
      } catch {}
    }
    setLoading(false);
  }, [attendeeToken, flushPendingQueue, profile?.emailConsent]);

  useEffect(() => {
    if (attendeeToken) fetchPassport();
  }, [attendeeToken, fetchPassport]);

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

  // Load initial pending check-in count from storage
  useEffect(() => {
    AsyncStorage.getItem(PENDING_CHECKINS_KEY).then((stored) => {
      if (stored) {
        try {
          const pending: PendingCheckin[] = JSON.parse(stored);
          setPendingCount(pending.length);
        } catch {}
      }
    }).catch(() => {});
  }, []);

  // Auto-open scanner when navigated from home screen with ?scan=true
  useEffect(() => {
    if (params.scan === "true" && !loading) {
      handleOpenScanner();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.scan, loading]);

  const handleBarcodeScan = ({ data }: { data: string }) => {
    if (scanned || !attendeeToken) return;
    // Printed booth QR:        <prefix>:booth:<boothId>:<permanent secret>
    // Live booth-screen code:  <prefix>:boothcode:<boothId>:<short-lived code>
    const staticPrefix = `${conferenceConfig.qrBoothPrefix}:booth:`;
    const rotatingPrefix = `${conferenceConfig.qrBoothPrefix}:boothcode:`;
    const isRotating = data.startsWith(rotatingPrefix);
    if (!isRotating && !data.startsWith(staticPrefix)) {
      Alert.alert("Invalid QR Code", `This QR code is not a ${conferenceConfig.organizationShortName} booth code. Please scan a booth QR code.`);
      return;
    }
    setScanned(true);
    const parts = data.slice((isRotating ? rotatingPrefix : staticPrefix).length).split(":");
    if (parts.length < 2) {
      Alert.alert("Invalid QR Code", "Malformed booth code.");
      return;
    }
    const boothId = parseInt(parts[0], 10);
    const code = isRotating ? { scanCode: parts[1] } : { secretToken: parts[1] };
    setScannerVisible(false);
    doCheckin(boothId, code, profile?.name ?? "", profile?.email ?? "");
  };

  const doCheckin = async (
    boothId: number,
    code: { secretToken?: string; scanCode?: string },
    name: string,
    email: string = "",
  ) => {
    if (!attendeeToken) return;
    setCheckingIn(true);
    try {
      const res = await apiFetch(`${API_BASE}/api/booths/checkin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ boothId, ...code, attendeeToken, attendeeName: name, attendeeEmail: email || undefined, emailConsent: profile?.emailConsent ?? false }),
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
          Alert.alert("🎉 Passport Complete!", `You've visited all booths! Find a ${conferenceConfig.organizationShortName} staff member to enter the raffle.`);
        } else {
          Alert.alert("✓ Checked in!", `Welcome to ${data.booth.name} (${data.booth.company})!`);
        }
      }
    } catch {
      // Network unavailable — queue the check-in and apply an optimistic update.
      // Live booth-screen codes expire within seconds, so only printed codes can be queued.
      const secretToken = code.secretToken;
      if (!secretToken) {
        Alert.alert("No connection", "Live booth codes can't be saved offline. Please scan again once you're connected.");
        setCheckingIn(false);
        return;
      }
      try {
        const stored = await AsyncStorage.getItem(PENDING_CHECKINS_KEY);
        const pending: PendingCheckin[] = stored ? JSON.parse(stored) : [];
        // Only queue if not already in the queue
        const alreadyQueued = pending.some((p) => p.boothId === boothId);
        if (!alreadyQueued) {
          pending.push({ boothId, secretToken, name, email });
          await AsyncStorage.setItem(PENDING_CHECKINS_KEY, JSON.stringify(pending));
          setPendingCount(pending.length);

          // Optimistically mark the booth as visited in local state
          setPassport((prev) => {
            if (!prev) return prev;
            const alreadyVisited = prev.booths.find((b) => b.id === boothId)?.visited;
            if (alreadyVisited) return prev;
            const booths = prev.booths.map((b) =>
              b.id === boothId ? { ...b, visited: true } : b
            );
            const newVisitedCount = prev.visitedCount + 1;
            const updated: PassportData = {
              ...prev,
              booths,
              visitedCount: newVisitedCount,
              complete: newVisitedCount >= prev.total,
            };
            // Also update the on-disk cache so it reflects this change
            AsyncStorage.setItem(PASSPORT_CACHE_KEY, JSON.stringify({ data: updated, ts: cacheTimestamp ?? Date.now() })).catch(() => {});
            return updated;
          });

          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert("Saved offline", "No connection right now — your check-in has been saved and will sync automatically when you're back online.");
        } else {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          Alert.alert("Already saved", "This booth is already saved and waiting to sync.");
        }
      } catch {
        Alert.alert("Error", "Could not save check-in. Please try again.");
      }
    }
    setCheckingIn(false);
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
      ) : tokenError ? (
        <View style={styles.center}>
          <Ionicons name="wifi-outline" size={48} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.foreground, marginTop: 16 }]}>Could not connect</Text>
          <Text style={[styles.emptySubtext, { color: colors.mutedForeground, textAlign: "center", marginTop: 6 }]}>
            Unable to register your device. Please check your connection and try again.
          </Text>
          <Pressable
            onPress={() => {
              setTokenError(false);
              setLoading(true);
              getOrCreateAttendeeToken().then((t) => {
                if (t) { setAttendeeToken(t); }
                else { setTokenError(true); setLoading(false); }
              });
            }}
            style={[styles.retryBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.retryBtnText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 120 }]} showsVerticalScrollIndicator={false}>

          {/* Offline / syncing banners */}
          {syncing && (
            <View style={[styles.offlineBanner, { backgroundColor: "#3b82f620", borderColor: "#3b82f6" }]}>
              <ActivityIndicator size="small" color="#3b82f6" />
              <Text style={[styles.offlineBannerText, { color: "#3b82f6" }]}>
                Syncing saved check-ins…
              </Text>
            </View>
          )}
          {!syncing && isOffline && (
            <Pressable
              onPress={() => fetchPassport()}
              style={[styles.offlineBanner, { backgroundColor: "#f59e0b20", borderColor: "#f59e0b" }]}
            >
              <Ionicons name="cloud-offline-outline" size={16} color="#f59e0b" />
              <Text style={[styles.offlineBannerText, { color: "#f59e0b" }]}>
                {"Offline — showing cached data"}
                {cacheTimestamp ? ` · Last synced ${formatRelativeTime(cacheTimestamp)}` : ""}
              </Text>
              <Text style={{ fontSize: 12, color: "#f59e0b", fontWeight: "600" }}>Retry</Text>
            </Pressable>
          )}
          {!syncing && isOffline && pendingCount > 0 && (
            <View style={[styles.offlineBanner, { backgroundColor: "#f59e0b20", borderColor: "#f59e0b" }]}>
              <Ionicons name="time-outline" size={16} color="#f59e0b" />
              <Text style={[styles.offlineBannerText, { color: "#f59e0b" }]}>
                {pendingCount === 1
                  ? "1 check-in saved — will sync when you're back online"
                  : `${pendingCount} check-ins saved — will sync when you're back online`}
              </Text>
            </View>
          )}

          {complete && (
            <View style={[styles.completeBanner, { backgroundColor: "#10b98120", borderColor: "#10b981" }]}>
              <Ionicons name="trophy" size={28} color="#10b981" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.completeTitle, { color: "#10b981" }]}>Passport Complete! 🎉</Text>
                <Text style={[styles.completeSubtitle, { color: colors.mutedForeground }]}>Find a {conferenceConfig.organizationShortName} staff member to enter the raffle.</Text>
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

          <View style={[styles.infoCard, { backgroundColor: colors.accent, borderColor: colors.border }]}>
            <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
            <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
              Scan the QR code at each exhibitor booth to mark it visited. Complete all booths to enter the raffle!
            </Text>
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
                    {booth.name && booth.name !== booth.company && (
                      <Text style={[styles.boothCompany, { color: colors.mutedForeground }]}>{booth.name}</Text>
                    )}
                  </View>
                  {booth.visited && (
                    <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                  )}
                </View>
              ))}
            </View>
          )}
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
  offlineBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  offlineBannerText: { fontSize: 13, fontWeight: "500", flex: 1 },
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
  emptySubtext: { fontSize: 13, lineHeight: 19, paddingHorizontal: 32 },
  retryBtn: { marginTop: 20, paddingHorizontal: 28, paddingVertical: 10, borderRadius: 8 },
  retryBtnText: { color: "#fff", fontWeight: "600", fontSize: 15 },
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
    backgroundColor: conferenceConfig.primaryColor,
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
