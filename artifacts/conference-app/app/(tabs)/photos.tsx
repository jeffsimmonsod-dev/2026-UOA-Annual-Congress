import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useTabletLayout } from "@/hooks/useTabletLayout";
import { useProfile } from "@/context/ProfileContext";
import ZoomableImage from "@/components/ZoomableImage";

const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;
const PHOTO_TOKENS_KEY = "@photo_delete_tokens";
const SESSION_TOKEN_KEY = "@photo_session_token";

async function getOrCreateSessionToken(): Promise<string> {
  const stored = await AsyncStorage.getItem(SESSION_TOKEN_KEY);
  if (stored) return stored;
  const res = await fetch(`${API_BASE}/api/photos/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error("Failed to create session");
  const { sessionToken } = await res.json();
  await AsyncStorage.setItem(SESSION_TOKEN_KEY, sessionToken);
  return sessionToken;
}

interface PhotoItem {
  id: string;
  objectPath: string;
  uploaderName: string;
  caption: string;
  likes: number;
  likedByMe: boolean;
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
  const { contentStyle, numPhotoColumns } = useTabletLayout();
  const isWeb = Platform.OS === "web";
  const { profile } = useProfile();

  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [myPhotoTokens, setMyPhotoTokens] = useState<Record<string, string>>({});

  useEffect(() => {
    Promise.all([
      getOrCreateSessionToken().catch(() => null),
      AsyncStorage.getItem(PHOTO_TOKENS_KEY),
    ]).then(([token, tokensVal]) => {
      if (token) setSessionToken(token);
      if (tokensVal) {
        try { setMyPhotoTokens(JSON.parse(tokensVal)); } catch { /* ignore */ }
      }
    });
  }, []);

  const [uploadModal, setUploadModal] = useState(false);
  const [pickedUri, setPickedUri] = useState<string | null>(null);
  const [caption, setCaption] = useState("");

  const [fullscreenPhoto, setFullscreenPhoto] = useState<PhotoItem | null>(null);

  const fetchPhotos = useCallback(async () => {
    try {
      const tokenParam = sessionToken ? `?sessionToken=${encodeURIComponent(sessionToken)}` : "";
      const res = await fetch(`${API_BASE}/api/photos${tokenParam}`);
      const data = await res.json();
      setPhotos(data.photos ?? []);
    } catch {
      // silently fail — show empty state
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [sessionToken]);

  useEffect(() => { fetchPhotos(); }, [fetchPhotos]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchPhotos();
  };

  const handleDelete = async (photo: PhotoItem) => {
    const deleteToken = myPhotoTokens[photo.id];
    if (!deleteToken) return;
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
                body: JSON.stringify({ deleteToken }),
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
    if (!sessionToken) return;
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
        body: JSON.stringify({ sessionToken }),
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
    const uploaderName = profile?.name?.trim() ?? "";
    if (!pickedUri || !uploaderName) {
      Alert.alert("Profile required", "Please complete your profile setup before uploading.");
      return;
    }
    if (!sessionToken) {
      Alert.alert("Not ready", "Please wait a moment and try again.");
      return;
    }
    setUploading(true);
    try {
      let uploadedPhoto: any = null;

      if (Platform.OS === "web") {
        // Web: use standard FormData + fetch
        const form = new FormData();
        form.append("photo", {
          uri: pickedUri,
          name: "photo.jpg",
          type: "image/jpeg",
        } as any);
        form.append("uploaderName", uploaderName);
        form.append("caption", caption.trim());
        form.append("sessionToken", sessionToken);
        const res = await fetch(`${API_BASE}/api/photos/upload`, {
          method: "POST",
          body: form,
        });
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(`Upload failed (${res.status}): ${JSON.stringify(errBody)}`);
        }
        uploadedPhoto = await res.json().catch(() => null);
      } else {
        // Native (iOS/Android): use FileSystem.uploadAsync for reliable multipart upload
        const result = await FileSystem.uploadAsync(
          `${API_BASE}/api/photos/upload`,
          pickedUri,
          {
            fieldName: "photo",
            httpMethod: "POST",
            uploadType: FileSystem.FileSystemUploadType.MULTIPART,
            parameters: {
              uploaderName,
              caption: caption.trim(),
              sessionToken,
            },
          }
        );
        if (result.status < 200 || result.status >= 300) {
          const errBody = JSON.parse(result.body || "{}");
          throw new Error(`Upload failed (${result.status}): ${JSON.stringify(errBody)}`);
        }
        uploadedPhoto = JSON.parse(result.body || "null");
      }
      if (uploadedPhoto?.id && uploadedPhoto?.deleteToken) {
        const newTokens = { ...myPhotoTokens, [uploadedPhoto.id]: uploadedPhoto.deleteToken };
        setMyPhotoTokens(newTokens);
        await AsyncStorage.setItem(PHOTO_TOKENS_KEY, JSON.stringify(newTokens));
      }

      setUploadModal(false);
      setPickedUri(null);
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

  const renderPhoto = ({ item }: { item: PhotoItem }) => {
    const isMyPhoto = item.id in myPhotoTokens;
    return (
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
          {isMyPhoto && (
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
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        key={numPhotoColumns}
        data={photos}
        keyExtractor={(item) => item.id}
        renderItem={renderPhoto}
        numColumns={numPhotoColumns}
        columnWrapperStyle={styles.row}
        contentContainerStyle={[
          styles.list,
          {
            paddingTop: insets.top + 16,
            paddingBottom: insets.bottom + 100,
          },
          contentStyle,
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

            <View style={[styles.nameTag, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <Ionicons name="person-circle-outline" size={16} color={colors.mutedForeground} />
              <Text style={[styles.nameTagText, { color: colors.foreground }]}>
                Uploading as <Text style={{ fontWeight: "700" }}>{profile?.name ?? "—"}</Text>
              </Text>
            </View>

            <TextInput
              style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
              placeholder="Add a caption (optional)"
              placeholderTextColor={colors.mutedForeground}
              value={caption}
              onChangeText={setCaption}
              maxLength={200}
              returnKeyType="done"
            />

            <View style={[styles.disclaimer, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <Ionicons name="information-circle-outline" size={14} color={colors.mutedForeground} />
              <Text style={[styles.disclaimerText, { color: colors.mutedForeground }]}>
                By sharing this photo you consent to it being used by the Utah Optometric Association for marketing and promotional purposes.
              </Text>
            </View>

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
  nameTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  nameTagText: {
    fontSize: 14,
  },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  disclaimer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
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
    width: "100%",
    height: "100%",
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
