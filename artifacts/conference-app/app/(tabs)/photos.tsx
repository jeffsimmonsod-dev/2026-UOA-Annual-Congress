import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
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

const SCREEN = Dimensions.get("window");

function ZoomableImage({ uri }: { uri: string }) {
  // Current animated values
  const scale = useSharedValue(1);
  const offsetX = useSharedValue(0);
  const offsetY = useSharedValue(0);

  // Saved values at gesture start
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

  // Pinch: update scale, then save on end
  const pinchGesture = Gesture.Pinch()
    .onBegin(() => {
      savedScale.value = scale.value;
      savedOffsetX.value = offsetX.value;
      savedOffsetY.value = offsetY.value;
    })
    .onUpdate((e) => {
      const newScale = Math.min(6, Math.max(1, savedScale.value * e.scale));
      scale.value = newScale;
      // Keep image centred on the pinch focal point
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

  // Pan: only active when zoomed in
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

  // Double-tap: zoom in or reset — withTiming so there's no bounce
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

  // Run pinch + pan simultaneously; double-tap races against them
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

const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

function getDeviceId(): string {
  if (typeof globalThis.__deviceId === "string") return globalThis.__deviceId;
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2);
  globalThis.__deviceId = id;
  return id;
}

interface PhotoItem {
  id: string;
  objectPath: string;
  uploaderName: string;
  uploaderDeviceId: string;
  caption: string;
  likes: number;
  likedByMe: boolean;
  isMyPhoto: boolean;
  createdAt: string;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function PhotosScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const deviceId = useRef(getDeviceId()).current;

  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [uploadModal, setUploadModal] = useState(false);
  const [pickedUri, setPickedUri] = useState<string | null>(null);
  const [uploaderName, setUploaderName] = useState("");
  const [caption, setCaption] = useState("");

  const [fullscreenPhoto, setFullscreenPhoto] = useState<PhotoItem | null>(null);

  const fetchPhotos = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/photos?deviceId=${encodeURIComponent(deviceId)}`);
      const data = await res.json();
      setPhotos(data.photos ?? []);
    } catch {
      // silently fail — show empty state
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [deviceId]);

  useEffect(() => { fetchPhotos(); }, [fetchPhotos]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchPhotos();
  };

  const handleDelete = async (photo: PhotoItem) => {
    Alert.alert(
      "Remove Photo",
      "Are you sure you want to remove this photo? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
            if (fullscreenPhoto?.id === photo.id) setFullscreenPhoto(null);
            try {
              await fetch(`${API_BASE}/api/photos/${photo.id}`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ deviceId }),
              });
            } catch {
              fetchPhotos();
            }
          },
        },
      ]
    );
  };

  const handleLike = async (photo: PhotoItem) => {
    setPhotos((prev) =>
      prev.map((p) =>
        p.id === photo.id
          ? { ...p, likes: p.likedByMe ? p.likes - 1 : p.likes + 1, likedByMe: !p.likedByMe }
          : p
      )
    );
    try {
      const res = await fetch(`${API_BASE}/api/photos/${photo.id}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId }),
      });
      const data = await res.json();
      setPhotos((prev) => prev.map((p) => (p.id === data.id ? data : p)));
    } catch {
      fetchPhotos();
    }
  };

  const handlePickImage = async () => {
    if (Platform.OS !== "web") {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Please allow access to your photo library to upload photos.");
        return;
      }
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.75,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (!result.canceled && result.assets[0]) {
      setPickedUri(result.assets[0].uri);
      setUploadModal(true);
    }
  };

  const handleUpload = async () => {
    if (!pickedUri || !uploaderName.trim()) {
      Alert.alert("Name required", "Please enter your name before uploading.");
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.append("photo", {
        uri: pickedUri,
        name: "photo.jpg",
        type: "image/jpeg",
      } as any);
      form.append("uploaderName", uploaderName.trim());
      form.append("caption", caption.trim());
      form.append("deviceId", deviceId);

      const res = await fetch(`${API_BASE}/api/photos/upload`, {
        method: "POST",
        body: form,
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(`Upload failed (${res.status}): ${JSON.stringify(errBody)}`);
      }

      setUploadModal(false);
      setPickedUri(null);
      setUploaderName("");
      setCaption("");
      fetchPhotos();
    } catch (err) {
      Alert.alert("Upload failed", String(err));
    } finally {
      setUploading(false);
    }
  };

  const getImageUrl = (objectPath: string) =>
    `${API_BASE}/api/storage${objectPath}`;

  const renderPhoto = ({ item }: { item: PhotoItem }) => (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Pressable onPress={() => setFullscreenPhoto(item)}>
        <Image
          source={{ uri: getImageUrl(item.objectPath) }}
          style={styles.cardImage}
          resizeMode="cover"
        />
      </Pressable>
      <View style={styles.cardFooter}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardName, { color: colors.foreground }]}>{item.uploaderName}</Text>
          {item.caption ? (
            <Text style={[styles.cardCaption, { color: colors.mutedForeground }]} numberOfLines={2}>
              {item.caption}
            </Text>
          ) : null}
          <Text style={[styles.cardTime, { color: colors.mutedForeground }]}>{timeAgo(item.createdAt)}</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          {item.isMyPhoto && (
            <Pressable
              onPress={() => handleDelete(item)}
              style={[styles.likeButton, { backgroundColor: colors.muted }]}
              hitSlop={8}
            >
              <Ionicons name="trash-outline" size={18} color={colors.mutedForeground} />
            </Pressable>
          )}
          <Pressable
            onPress={() => handleLike(item)}
            style={[
              styles.likeButton,
              { backgroundColor: item.likedByMe ? "#ef444420" : colors.muted },
            ]}
          >
            <Ionicons
              name={item.likedByMe ? "heart" : "heart-outline"}
              size={20}
              color={item.likedByMe ? "#ef4444" : colors.mutedForeground}
            />
            <Text style={[styles.likeCount, { color: item.likedByMe ? "#ef4444" : colors.mutedForeground }]}>
              {item.likes}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        data={photos}
        keyExtractor={(item) => item.id}
        renderItem={renderPhoto}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={[
          styles.list,
          {
            paddingTop: isWeb ? insets.top + 16 : 16,
            paddingBottom: isWeb ? insets.bottom + 100 : 100,
          },
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.emptyState}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="images-outline" size={48} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No photos yet</Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                Be the first to share a moment from the congress!
              </Text>
            </View>
          )
        }
      />

      <Pressable
        onPress={handlePickImage}
        style={[
          styles.fab,
          { backgroundColor: colors.primary, bottom: insets.bottom + (isWeb ? 90 : 90) },
        ]}
      >
        <Ionicons name="camera" size={24} color="#fff" />
        <Text style={styles.fabText}>Add Photo</Text>
      </Pressable>

      <Modal visible={uploadModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <Pressable style={styles.modalOverlay} onPress={() => !uploading && setUploadModal(false)} />
          <View style={[styles.modalSheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalHandle} />
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Share Your Photo</Text>

            {pickedUri && (
              <Image source={{ uri: pickedUri }} style={styles.preview} resizeMode="cover" />
            )}

            <TextInput
              style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
              placeholder="Your name *"
              placeholderTextColor={colors.mutedForeground}
              value={uploaderName}
              onChangeText={setUploaderName}
              maxLength={50}
              returnKeyType="next"
            />
            <TextInput
              style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
              placeholder="Add a caption (optional)"
              placeholderTextColor={colors.mutedForeground}
              value={caption}
              onChangeText={setCaption}
              maxLength={200}
              returnKeyType="done"
            />

            <Pressable
              onPress={handleUpload}
              disabled={uploading}
              style={[styles.uploadBtn, { backgroundColor: uploading ? colors.muted : colors.primary }]}
            >
              {uploading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="cloud-upload-outline" size={18} color="#fff" />
                  <Text style={styles.uploadBtnText}>Share with Everyone</Text>
                </>
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={!!fullscreenPhoto} animationType="fade" transparent statusBarTranslucent>
        <GestureHandlerRootView style={styles.fsOverlay}>
          {fullscreenPhoto && (
            <>
              <ZoomableImage uri={getImageUrl(fullscreenPhoto.objectPath)} />
              <View style={styles.fsMeta}>
                <Text style={styles.fsName}>{fullscreenPhoto.uploaderName}</Text>
                {fullscreenPhoto.caption ? (
                  <Text style={styles.fsCaption}>{fullscreenPhoto.caption}</Text>
                ) : null}
                <Text style={styles.fsHint}>Pinch to zoom · Double-tap to reset</Text>
              </View>
              <Pressable style={styles.fsClose} onPress={() => setFullscreenPhoto(null)}>
                <Ionicons name="close-circle" size={36} color="rgba(255,255,255,0.85)" />
              </Pressable>
            </>
          )}
        </GestureHandlerRootView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: 12,
    gap: 0,
  },
  row: {
    gap: 10,
    marginBottom: 10,
    paddingHorizontal: 0,
  },
  card: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  cardImage: {
    width: "100%",
    aspectRatio: 1,
  },
  cardFooter: {
    padding: 10,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  cardName: {
    fontSize: 13,
    fontWeight: "600",
  },
  cardCaption: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  cardTime: {
    fontSize: 11,
    marginTop: 4,
  },
  likeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  likeCount: {
    fontSize: 13,
    fontWeight: "600",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
    gap: 12,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  fab: {
    position: "absolute",
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  fabText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    gap: 14,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#ccc",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  preview: {
    width: "100%",
    height: 200,
    borderRadius: 12,
  },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  uploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 15,
    borderRadius: 14,
  },
  uploadBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
  fsOverlay: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  fsImage: {
    width: SCREEN.width,
    height: SCREEN.height * 0.72,
  },
  fsMeta: {
    position: "absolute",
    bottom: 50,
    left: 0,
    right: 0,
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 24,
  },
  fsName: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  fsCaption: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 14,
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  fsHint: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 12,
    marginTop: 2,
  },
  fsClose: {
    position: "absolute",
    top: 52,
    right: 16,
  },
});
