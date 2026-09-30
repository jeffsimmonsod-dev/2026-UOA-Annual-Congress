import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useColors } from "@/hooks/useColors";
import { communityRequest } from "@/services/community";

type EntityType = "comment" | "reply" | "discussion";
interface Post { id: string; title: string; body: string; authorName: string; replyCount: number; createdAt: string; }
interface Reply { id: string; body: string; authorName: string; createdAt: string; canDelete: boolean; }
interface DiscussionDetail extends Post { replies: Reply[]; canDelete?: boolean; }
interface CommunityComment { id: string; body: string; authorName: string; createdAt: string; canDelete: boolean; }

function timeAgo(value: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
  return `${Math.floor(minutes / 1440)}d ago`;
}

function errorText(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}

function confirmDestructiveAction(title: string, message: string, onConfirm: () => Promise<void>) {
  const confirm = () => { void onConfirm(); };
  if (Platform.OS === "web") {
    if (typeof window !== "undefined" && window.confirm(`${title}\n\n${message}`)) confirm();
    return;
  }
  Alert.alert(title, message, [
    { text: "Cancel", style: "cancel" },
    { text: "Delete", style: "destructive", onPress: confirm },
  ]);
}

function showActionError(title: string, error: unknown) {
  const message = errorText(error);
  if (Platform.OS === "web" && typeof window !== "undefined") window.alert(`${title}\n\n${message}`);
  else Alert.alert(title, message);
}

function jsonOptions(method: string, body: unknown): RequestInit {
  return { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

export function ReportDialog({
  visible, onClose, onSubmit,
}: { visible: boolean; onClose: () => void; onSubmit: (reason: string) => Promise<void> }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [reason, setReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [sending, setSending] = useState(false);
  const options = ["Spam", "Harassment", "Inappropriate content", "Other"];
  useEffect(() => {
    if (visible) {
      setReason("");
      setCustomReason("");
    }
  }, [visible]);
  const submit = async () => {
    const value = reason === "Other" ? customReason.trim() : reason;
    if (!value) {
      Alert.alert("Choose a reason", "Select a reason or describe the issue.");
      return;
    }
    setSending(true);
    try {
      await onSubmit(value);
      setReason("");
      setCustomReason("");
      onClose();
      Alert.alert("Report sent", "Thank you. The community team will review it.");
    } catch (error) {
      Alert.alert("Report failed", errorText(error));
    } finally {
      setSending(false);
    }
  };
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <View style={styles.modalScrim}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
          <View style={[styles.sheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + 18 }]}>
          <View style={styles.sheetHeader}>
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Report content</Text>
            <Pressable onPress={onClose} hitSlop={10}><Ionicons name="close" size={23} color={colors.mutedForeground} /></Pressable>
          </View>
          <Text style={[styles.helperText, { color: colors.mutedForeground }]}>Choose the reason that best describes the issue.</Text>
          {options.map((option) => (
            <Pressable key={option} onPress={() => setReason(option)} style={[styles.reasonOption, { borderColor: reason === option ? colors.primary : colors.border, backgroundColor: reason === option ? `${colors.primary}12` : colors.background }]}>
              <Ionicons name={reason === option ? "radio-button-on" : "radio-button-off"} size={20} color={reason === option ? colors.primary : colors.mutedForeground} />
              <Text style={[styles.bodyText, { color: colors.foreground }]}>{option}</Text>
            </Pressable>
          ))}
          {reason === "Other" && (
            <TextInput value={customReason} onChangeText={setCustomReason} multiline maxLength={300} placeholder="Tell us what happened" placeholderTextColor={colors.mutedForeground} style={[styles.input, styles.multiline, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border }]} />
          )}
          <Pressable disabled={sending} onPress={submit} style={[styles.primaryButton, { backgroundColor: colors.primary, opacity: sending ? 0.65 : 1 }]}>
            {sending ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Send report</Text>}
          </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function PhotoComments({
  photoId, sessionToken, name, visible, onClose,
}: { photoId: string; sessionToken: string | null; name: string; visible: boolean; onClose: () => void }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const [restricted, setRestricted] = useState(false);
  const [error, setError] = useState("");
  const [reportTarget, setReportTarget] = useState<string | null>(null);
  const canPost = !!name.trim() && !restricted;

  const load = useCallback(async () => {
    if (!sessionToken) { setError("Your photo session is not ready. Please try again."); setLoading(false); return; }
    try {
      setError("");
      const data = await communityRequest<{ comments: CommunityComment[] }>(`/api/community/photos/${encodeURIComponent(photoId)}/comments?sessionToken=${encodeURIComponent(sessionToken)}`);
      setComments(data.comments ?? []);
    } catch (err) { setError(errorText(err)); }
    finally { setLoading(false); setRefreshing(false); }
  }, [photoId, sessionToken]);

  useEffect(() => { if (visible) load(); }, [visible, load]);
  useEffect(() => {
    if (!visible || !sessionToken || !name.trim()) return;
    communityRequest<{ restricted: boolean }>("/api/community/profile", jsonOptions("POST", { sessionToken, name: name.trim() }))
      .then((data) => setRestricted(data.restricted))
      .catch((err) => setError(errorText(err)));
  }, [visible, sessionToken, name]);

  const submit = async () => {
    if (!sessionToken || !name.trim() || !body.trim()) return;
    setSending(true);
    try {
      await communityRequest(`/api/community/photos/${encodeURIComponent(photoId)}/comments`, jsonOptions("POST", { sessionToken, name: name.trim(), body: body.trim() }));
      setBody("");
      await load();
    } catch (err) { Alert.alert("Comment not sent", errorText(err)); }
    finally { setSending(false); }
  };
  const removeComment = (comment: CommunityComment) => confirmDestructiveAction("Delete comment", "Remove this comment?", async () => {
      try {
        await communityRequest(`/api/community/comment/${encodeURIComponent(comment.id)}`, jsonOptions("DELETE", { sessionToken }));
        await load();
      } catch (err) { showActionError("Delete failed", err); }
  });
  const sendReport = async (reason: string) => {
    if (!sessionToken || !reportTarget) throw new Error("Your photo session is not ready.");
    await communityRequest("/api/community/reports", jsonOptions("POST", { sessionToken, type: "comment", id: reportTarget, reason }));
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior="padding" style={[styles.screen, { backgroundColor: colors.background, paddingTop: Platform.OS === "web" ? 67 : insets.top }]}>
        <View style={[styles.navHeader, { borderBottomColor: colors.border }]}>
          <Pressable onPress={onClose} style={styles.navSide}><Ionicons name="chevron-back" size={25} color={colors.primary} /></Pressable>
          <Text style={[styles.navTitle, { color: colors.foreground }]}>Photo comments</Text>
          <Pressable onPress={() => { setRefreshing(true); load(); }} style={styles.navSide}><Ionicons name="refresh" size={20} color={colors.primary} /></Pressable>
        </View>
        {restricted && <Text style={[styles.restrictionBanner, { color: colors.destructive ?? colors.primary, backgroundColor: colors.muted }]}>Your community account is restricted. You can read comments but cannot post.</Text>}
        {!name.trim() && <Text style={[styles.restrictionBanner, { color: colors.mutedForeground, backgroundColor: colors.muted }]}>Complete your attendee profile to join the conversation.</Text>}
        {!!error && <Text style={[styles.errorText, { color: colors.destructive ?? "#b42318" }]}>{error}</Text>}
        <FlatList
          data={comments}
          keyExtractor={(item) => item.id}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
          contentContainerStyle={{ padding: 16, paddingBottom: 16, flexGrow: 1 }}
          ListEmptyComponent={loading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} /> : <Text style={[styles.emptyMessage, { color: colors.mutedForeground }]}>No comments yet. Start the conversation.</Text>}
          renderItem={({ item }) => (
            <View style={[styles.commentCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.commentTop}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.author, { color: colors.foreground }]}>{item.authorName}</Text>
                  <Text style={[styles.time, { color: colors.mutedForeground }]}>{timeAgo(item.createdAt)}</Text>
                </View>
                <Pressable accessibilityLabel="Report comment" hitSlop={8} onPress={() => setReportTarget(item.id)}><Ionicons name="flag-outline" size={19} color={colors.mutedForeground} /></Pressable>
                {item.canDelete && <Pressable accessibilityLabel="Delete comment" hitSlop={8} onPress={() => removeComment(item)}><Ionicons name="trash-outline" size={18} color={colors.mutedForeground} /></Pressable>}
              </View>
              <Text style={[styles.bodyText, { color: colors.foreground }]}>{item.body}</Text>
            </View>
          )}
        />
        <View style={[styles.composer, { borderTopColor: colors.border, paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 10, backgroundColor: colors.background }]}>
          <TextInput value={body} onChangeText={setBody} maxLength={1000} multiline editable={canPost} placeholder={restricted ? "Posting is currently unavailable" : !name.trim() ? "Profile name required to comment" : "Add a comment"} placeholderTextColor={colors.mutedForeground} style={[styles.input, styles.commentInput, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border }]} />
          <Pressable disabled={sending || !canPost || !body.trim()} onPress={submit} style={[styles.sendButton, { backgroundColor: colors.primary, opacity: sending || !canPost || !body.trim() ? 0.5 : 1 }]}><Ionicons name="send" size={18} color="#fff" /></Pressable>
        </View>
        <ReportDialog visible={!!reportTarget} onClose={() => setReportTarget(null)} onSubmit={sendReport} />
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function CommunitySections({
  section, sessionToken, name,
}: { section: "discussion" | "leaderboard"; sessionToken: string | null; name: string }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [discussions, setDiscussions] = useState<Post[]>([]);
  const [leaders, setLeaders] = useState<Array<{ name: string; points: number; rank: number }>>([]);
  const [me, setMe] = useState<{ name: string; points: number; rank: number } | null>(null);
  const [cutoffAt, setCutoffAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [restricted, setRestricted] = useState(false);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState<DiscussionDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [createVisible, setCreateVisible] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [replyBody, setReplyBody] = useState("");
  const [sending, setSending] = useState(false);
  const [reportTarget, setReportTarget] = useState<{ type: EntityType; id: string } | null>(null);
  const [scoreInfo, setScoreInfo] = useState(false);
  const canPost = !!name.trim() && !restricted;

  const load = useCallback(async () => {
    if (!sessionToken) { setError("Your photo session is not ready. Please try again."); setLoading(false); setRefreshing(false); return; }
    try {
      setError("");
      if (section === "discussion") {
        const data = await communityRequest<{ discussions: Post[] }>(`/api/community/discussions?sessionToken=${encodeURIComponent(sessionToken)}`);
        setDiscussions(data.discussions ?? []);
      } else {
        const data = await communityRequest<{ leaders: Array<{ name: string; points: number; rank: number }>; me: { name: string; points: number; rank: number } | null; cutoffAt: string | null }>(`/api/community/leaderboard?sessionToken=${encodeURIComponent(sessionToken)}`);
        setLeaders(data.leaders ?? []);
        setMe(data.me ?? null);
        setCutoffAt(data.cutoffAt ?? null);
      }
    } catch (err) { setError(errorText(err)); }
    finally { setLoading(false); setRefreshing(false); }
  }, [section, sessionToken]);
  const syncProfile = useCallback(async () => {
    if (!sessionToken || !name.trim()) return;
    try {
      const data = await communityRequest<{ restricted: boolean }>("/api/community/profile", jsonOptions("POST", { sessionToken, name: name.trim() }));
      setRestricted(data.restricted);
    } catch (err) { setError(errorText(err)); }
  }, [sessionToken, name]);
  useFocusEffect(useCallback(() => { setLoading(true); load(); syncProfile(); }, [load, syncProfile]));

  const openDiscussion = async (id: string) => {
    if (!sessionToken) return;
    setDetailLoading(true);
    setDetail(null);
    try {
      const data = await communityRequest<{ discussion: DiscussionDetail }>(`/api/community/discussions/${encodeURIComponent(id)}?sessionToken=${encodeURIComponent(sessionToken)}`);
      setDetail(data.discussion);
    } catch (err) { Alert.alert("Could not open discussion", errorText(err)); }
    finally { setDetailLoading(false); }
  };
  const createDiscussion = async () => {
    if (!sessionToken || !title.trim() || !body.trim()) return;
    setSending(true);
    try {
      const data = await communityRequest<{ discussion: Post }>("/api/community/discussions", jsonOptions("POST", { sessionToken, name: name.trim(), title: title.trim(), body: body.trim() }));
      setDiscussions((items) => [data.discussion, ...items]);
      setTitle(""); setBody(""); setCreateVisible(false);
      await openDiscussion(data.discussion.id);
    } catch (err) { Alert.alert("Discussion not posted", errorText(err)); }
    finally { setSending(false); }
  };
  const sendReply = async () => {
    if (!sessionToken || !detail || !replyBody.trim()) return;
    setSending(true);
    try {
      await communityRequest(`/api/community/discussions/${encodeURIComponent(detail.id)}/replies`, jsonOptions("POST", { sessionToken, name: name.trim(), body: replyBody.trim() }));
      setReplyBody("");
      await openDiscussion(detail.id);
      await load();
    } catch (err) { Alert.alert("Reply not sent", errorText(err)); }
    finally { setSending(false); }
  };
  const remove = (type: EntityType, id: string) => confirmDestructiveAction(`Delete ${type}`, `Remove this ${type}?`, async () => {
      if (!sessionToken) return;
      try {
        await communityRequest(`/api/community/${type}/${encodeURIComponent(id)}`, jsonOptions("DELETE", { sessionToken }));
        if (type === "discussion") setDetail(null);
        else if (detail) await openDiscussion(detail.id);
        await load();
      } catch (err) { showActionError("Delete failed", err); }
  });
  const sendReport = async (reason: string) => {
    if (!sessionToken || !reportTarget) throw new Error("Your photo session is not ready.");
    await communityRequest("/api/community/reports", jsonOptions("POST", { sessionToken, type: reportTarget.type, id: reportTarget.id, reason }));
  };
  const listRefresh = () => { setRefreshing(true); load(); };

  if (section === "leaderboard") {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        {!!error && <Text style={[styles.errorText, { color: colors.destructive ?? "#b42318" }]}>{error}</Text>}
        <FlatList
          data={leaders}
          keyExtractor={(item) => `${item.rank}-${item.name}`}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={listRefresh} tintColor={colors.primary} />}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: insets.bottom + 100, gap: 10 }}
          ListHeaderComponent={
            <View style={[styles.scoreCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.scoreHeader}>
                <View style={{ flex: 1 }}><Text style={[styles.sectionEyebrow, { color: colors.primary }]}>COMMUNITY SCORE</Text><Text style={[styles.scoreTitle, { color: colors.foreground }]}>Show up. Join in.</Text></View>
                <Pressable onPress={() => setScoreInfo(true)} accessibilityLabel="How scoring works"><Ionicons name="information-circle-outline" size={24} color={colors.primary} /></Pressable>
              </View>
              {me ? <View style={[styles.myRankRow, { borderTopColor: colors.border }]}><View><Text style={[styles.smallLabel, { color: colors.mutedForeground }]}>YOUR RANK</Text><Text style={[styles.myRankName, { color: colors.foreground }]}>{me.name}</Text></View><View style={{ alignItems: "flex-end" }}><Text style={[styles.rankNumber, { color: colors.primary }]}>#{me.rank}</Text><Text style={[styles.points, { color: colors.mutedForeground }]}>{me.points} points</Text></View></View> : <Text style={[styles.helperText, { color: colors.mutedForeground }]}>Your rank will appear here when you earn community points.</Text>}
              {!!cutoffAt && <Text style={[styles.cutoffText, { color: colors.mutedForeground }]}>Scores through {new Date(cutoffAt).toLocaleDateString()}</Text>}
              <Text style={[styles.listTitle, { color: colors.foreground }]}>Top contributors</Text>
            </View>
          }
          ListEmptyComponent={loading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 30 }} /> : <Text style={[styles.emptyMessage, { color: colors.mutedForeground }]}>No leaderboard scores yet.</Text>}
          renderItem={({ item }) => (
            <View style={[styles.leaderRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.leaderRank, { color: item.rank <= 3 ? colors.primary : colors.mutedForeground }]}>{String(item.rank).padStart(2, "0")}</Text>
              <View style={{ flex: 1 }}><Text style={[styles.author, { color: colors.foreground }]}>{item.name}</Text><Text style={[styles.time, { color: colors.mutedForeground }]}>{item.points} points</Text></View>
              {item.rank <= 3 && <Ionicons name="trophy-outline" size={19} color={colors.primary} />}
            </View>
          )}
        />
        <Modal visible={scoreInfo} transparent animationType="fade" onRequestClose={() => setScoreInfo(false)}>
          <View style={styles.centerOverlay}><Pressable style={StyleSheet.absoluteFill} onPress={() => setScoreInfo(false)} /><View style={[styles.infoCard, { backgroundColor: colors.card }]}><Text style={[styles.sheetTitle, { color: colors.foreground }]}>How points work</Text><Text style={[styles.bodyText, { color: colors.mutedForeground }]}>Community points recognize participation across conference community activities. Your total, rank, and the top contributors are shown here. The score cutoff indicates how current the leaderboard is.</Text><Pressable onPress={() => setScoreInfo(false)} style={[styles.primaryButton, { backgroundColor: colors.primary }]}><Text style={styles.primaryButtonText}>Got it</Text></Pressable></View></View>
        </Modal>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {restricted && <Text style={[styles.restrictionBanner, { color: colors.destructive ?? colors.primary, backgroundColor: colors.muted }]}>Your community account is restricted. You can read posts but cannot create or reply.</Text>}
      {section === "discussion" && !name.trim() && <Text style={[styles.restrictionBanner, { color: colors.mutedForeground, backgroundColor: colors.muted }]}>Complete your attendee profile to create discussions or reply.</Text>}
      {!!error && <Text style={[styles.errorText, { color: colors.destructive ?? "#b42318" }]}>{error}</Text>}
      <FlatList
        data={discussions}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={listRefresh} tintColor={colors.primary} />}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: insets.bottom + 105, gap: 10 }}
        ListHeaderComponent={<View style={styles.discussionHeading}><View style={{ flex: 1 }}><Text style={[styles.sectionEyebrow, { color: colors.primary }]}>THE FLOOR IS YOURS</Text><Text style={[styles.discussionHeadingText, { color: colors.foreground }]}>Talk with fellow attendees</Text></View><Pressable disabled={!canPost} onPress={() => setCreateVisible(true)} style={[styles.createButton, { backgroundColor: colors.primary, opacity: canPost ? 1 : 0.45 }]}><Ionicons name="add" size={20} color="#fff" /><Text style={styles.createButtonText}>New</Text></Pressable></View>}
        ListEmptyComponent={loading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 30 }} /> : <Text style={[styles.emptyMessage, { color: colors.mutedForeground }]}>No discussions yet. Start one for the community.</Text>}
        renderItem={({ item }) => (
          <Pressable onPress={() => openDiscussion(item.id)} style={[styles.discussionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.discussionTitle, { color: colors.foreground }]}>{item.title}</Text>
            <Text style={[styles.discussionBody, { color: colors.mutedForeground }]} numberOfLines={3}>{item.body}</Text>
            <View style={styles.cardMeta}><Text style={[styles.time, { color: colors.mutedForeground }]}>{item.authorName} · {timeAgo(item.createdAt)}</Text><View style={styles.replyCount}><Ionicons name="chatbubble-outline" size={14} color={colors.primary} /><Text style={[styles.time, { color: colors.primary }]}>{item.replyCount}</Text></View></View>
          </Pressable>
        )}
      />
      <Pressable onPress={listRefresh} style={[styles.refreshButton, { bottom: insets.bottom + 90, backgroundColor: colors.card, borderColor: colors.border }]} accessibilityLabel="Refresh discussions"><Ionicons name="refresh" size={19} color={colors.primary} /></Pressable>

      <Modal visible={createVisible} animationType="slide" onRequestClose={() => setCreateVisible(false)}>
        <KeyboardAvoidingView behavior="padding" style={[styles.screen, { backgroundColor: colors.background, paddingTop: Platform.OS === "web" ? 67 : insets.top }]}>
          <View style={[styles.navHeader, { borderBottomColor: colors.border }]}><Pressable onPress={() => setCreateVisible(false)} style={styles.navSide}><Ionicons name="chevron-back" size={25} color={colors.primary} /></Pressable><Text style={[styles.navTitle, { color: colors.foreground }]}>New discussion</Text><View style={styles.navSide} /></View>
          <View style={{ padding: 18, gap: 14 }}>
            <TextInput value={title} onChangeText={setTitle} maxLength={120} placeholder="A clear, specific title" placeholderTextColor={colors.mutedForeground} style={[styles.input, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border }]} />
            <TextInput value={body} onChangeText={setBody} multiline maxLength={4000} textAlignVertical="top" placeholder="What would you like to discuss?" placeholderTextColor={colors.mutedForeground} style={[styles.input, styles.createBody, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border }]} />
            <Pressable disabled={sending || !title.trim() || !body.trim()} onPress={createDiscussion} style={[styles.primaryButton, { backgroundColor: colors.primary, opacity: sending || !title.trim() || !body.trim() ? 0.5 : 1 }]}>{sending ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Post discussion</Text>}</Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      <Modal visible={!!detail || detailLoading} animationType="slide" onRequestClose={() => setDetail(null)}>
        <KeyboardAvoidingView behavior="padding" style={[styles.screen, { backgroundColor: colors.background, paddingTop: Platform.OS === "web" ? 67 : insets.top }]}>
          <View style={[styles.navHeader, { borderBottomColor: colors.border }]}><Pressable onPress={() => setDetail(null)} style={styles.navSide}><Ionicons name="chevron-back" size={25} color={colors.primary} /></Pressable><Text style={[styles.navTitle, { color: colors.foreground }]}>Discussion</Text><View style={styles.navSide} /></View>
          {restricted && <Text style={[styles.restrictionBanner, { color: colors.destructive ?? colors.primary, backgroundColor: colors.muted }]}>Your community account is restricted. You can read replies but cannot post.</Text>}
          {!name.trim() && <Text style={[styles.restrictionBanner, { color: colors.mutedForeground, backgroundColor: colors.muted }]}>Complete your attendee profile to reply.</Text>}
          {detailLoading || !detail ? <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} /> : <>
            <FlatList
              data={detail.replies ?? []}
              keyExtractor={(item) => item.id}
              keyboardDismissMode="interactive"
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ padding: 16, paddingBottom: 18 }}
              ListHeaderComponent={<View style={[styles.detailPost, { backgroundColor: colors.card, borderColor: colors.border }]}><Text style={[styles.discussionTitle, { color: colors.foreground }]}>{detail.title}</Text><Text style={[styles.bodyText, { color: colors.foreground, marginTop: 10 }]}>{detail.body}</Text><View style={styles.cardMeta}><Text style={[styles.time, { color: colors.mutedForeground }]}>{detail.authorName} · {timeAgo(detail.createdAt)}</Text><View style={styles.replyCount}><Pressable accessibilityLabel="Report discussion" onPress={() => setReportTarget({ type: "discussion", id: detail.id })}><Ionicons name="flag-outline" size={18} color={colors.mutedForeground} /></Pressable>{detail.canDelete && <Pressable accessibilityLabel="Delete discussion" onPress={() => remove("discussion", detail.id)}><Ionicons name="trash-outline" size={18} color={colors.mutedForeground} /></Pressable>}</View></View><Text style={[styles.listTitle, { color: colors.foreground, marginTop: 18 }]}>Replies</Text></View>}
              ListEmptyComponent={<Text style={[styles.emptyMessage, { color: colors.mutedForeground }]}>No replies yet.</Text>}
              renderItem={({ item }) => <View style={[styles.replyCard, { backgroundColor: colors.card, borderColor: colors.border }]}><View style={styles.commentTop}><View style={{ flex: 1 }}><Text style={[styles.author, { color: colors.foreground }]}>{item.authorName}</Text><Text style={[styles.time, { color: colors.mutedForeground }]}>{timeAgo(item.createdAt)}</Text></View><Pressable accessibilityLabel="Report reply" onPress={() => setReportTarget({ type: "reply", id: item.id })}><Ionicons name="flag-outline" size={18} color={colors.mutedForeground} /></Pressable>{item.canDelete && <Pressable accessibilityLabel="Delete reply" onPress={() => remove("reply", item.id)}><Ionicons name="trash-outline" size={18} color={colors.mutedForeground} /></Pressable>}</View><Text style={[styles.bodyText, { color: colors.foreground, marginTop: 8 }]}>{item.body}</Text></View>}
            />
            <View style={[styles.composer, { borderTopColor: colors.border, paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 10, backgroundColor: colors.background }]}>
              <TextInput value={replyBody} onChangeText={setReplyBody} multiline maxLength={2000} editable={canPost} placeholder={restricted ? "Posting is currently unavailable" : !name.trim() ? "Profile name required to reply" : "Write a reply"} placeholderTextColor={colors.mutedForeground} style={[styles.input, styles.commentInput, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border }]} />
              <Pressable disabled={sending || !canPost || !replyBody.trim()} onPress={sendReply} style={[styles.sendButton, { backgroundColor: colors.primary, opacity: sending || !canPost || !replyBody.trim() ? 0.5 : 1 }]}><Ionicons name="send" size={18} color="#fff" /></Pressable>
            </View>
          </>}
        </KeyboardAvoidingView>
      </Modal>
      <ReportDialog visible={!!reportTarget} onClose={() => setReportTarget(null)} onSubmit={sendReport} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  modalScrim: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.42)" },
  sheet: { padding: 20, borderTopLeftRadius: 22, borderTopRightRadius: 22, gap: 12 },
  sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sheetTitle: { fontSize: 20, fontWeight: "700" },
  helperText: { fontSize: 13, lineHeight: 19 },
  reasonOption: { borderWidth: 1, borderRadius: 12, padding: 12, flexDirection: "row", alignItems: "center", gap: 10 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  multiline: { minHeight: 90, textAlignVertical: "top" },
  primaryButton: { minHeight: 48, borderRadius: 12, alignItems: "center", justifyContent: "center", paddingHorizontal: 18, marginTop: 2 },
  primaryButtonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  bodyText: { fontSize: 14, lineHeight: 21 },
  navHeader: { minHeight: 52, flexDirection: "row", alignItems: "center", borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: 12 },
  navSide: { width: 40, alignItems: "flex-start" },
  navTitle: { flex: 1, textAlign: "center", fontSize: 17, fontWeight: "700" },
  restrictionBanner: { padding: 11, marginHorizontal: 16, marginTop: 10, borderRadius: 10, fontSize: 13, lineHeight: 18 },
  errorText: { marginHorizontal: 16, marginTop: 10, fontSize: 13, lineHeight: 19 },
  emptyMessage: { textAlign: "center", padding: 26, fontSize: 14, lineHeight: 20 },
  commentCard: { borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 10, gap: 9 },
  commentTop: { flexDirection: "row", alignItems: "center", gap: 14 },
  author: { fontSize: 14, fontWeight: "700" },
  time: { fontSize: 12, marginTop: 3 },
  composer: { flexDirection: "row", alignItems: "flex-end", gap: 9, paddingHorizontal: 14, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth },
  commentInput: { flex: 1, minHeight: 44, maxHeight: 110, paddingVertical: 10 },
  sendButton: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  scoreCard: { borderWidth: 1, borderRadius: 18, padding: 17, marginBottom: 6 },
  scoreHeader: { flexDirection: "row", alignItems: "center", marginBottom: 18 },
  sectionEyebrow: { fontSize: 10, fontWeight: "800", letterSpacing: 1.25 },
  scoreTitle: { fontSize: 21, fontWeight: "700", marginTop: 4 },
  myRankRow: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  smallLabel: { fontSize: 10, letterSpacing: 1, fontWeight: "700" },
  myRankName: { fontSize: 16, fontWeight: "700", marginTop: 4 },
  rankNumber: { fontSize: 26, fontWeight: "800" },
  points: { fontSize: 12 },
  cutoffText: { marginTop: 12, fontSize: 11 },
  listTitle: { fontSize: 16, fontWeight: "700", marginTop: 18, marginBottom: 5 },
  leaderRow: { borderWidth: 1, borderRadius: 13, padding: 14, flexDirection: "row", alignItems: "center", gap: 13 },
  leaderRank: { fontSize: 17, fontWeight: "800", width: 30 },
  infoCard: { width: "88%", maxWidth: 430, borderRadius: 18, padding: 22, gap: 16 },
  centerOverlay: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.45)" },
  discussionHeading: { flexDirection: "row", alignItems: "center", paddingTop: 3, paddingBottom: 8, gap: 12 },
  discussionHeadingText: { fontSize: 19, fontWeight: "700", marginTop: 4 },
  createButton: { borderRadius: 22, paddingHorizontal: 14, paddingVertical: 10, flexDirection: "row", alignItems: "center", gap: 5 },
  createButtonText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  discussionCard: { borderWidth: 1, borderRadius: 15, padding: 15 },
  discussionTitle: { fontSize: 16, fontWeight: "700", lineHeight: 22 },
  discussionBody: { fontSize: 14, lineHeight: 20, marginTop: 7 },
  cardMeta: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 13 },
  replyCount: { flexDirection: "row", alignItems: "center", gap: 8 },
  refreshButton: { position: "absolute", right: 18, bottom: 24, width: 46, height: 46, borderWidth: 1, borderRadius: 23, alignItems: "center", justifyContent: "center", elevation: 3 },
  createBody: { minHeight: 180, textAlignVertical: "top" },
  detailPost: { borderWidth: 1, borderRadius: 15, padding: 16, marginBottom: 12 },
  replyCard: { borderWidth: 1, borderRadius: 13, padding: 13, marginBottom: 10 },
});