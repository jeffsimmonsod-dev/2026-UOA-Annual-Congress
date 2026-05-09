import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Linking from "expo-linking";
import { router, useLocalSearchParams } from "expo-router";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSchedule } from "@/context/ScheduleContext";
import { useNote } from "@/hooks/useNotes";
import { useColors } from "@/hooks/useColors";
import { getRoomColor } from "@/constants/roomColors";
import { getSessionById, getSpeakersForSession } from "@/services/data";
import RoomMapModal from "@/components/RoomMapModal";

const TRACK_COLORS: Record<string, string> = {
  "Retinal Disease": "#ef4444",
  "Neuro-Optometry": "#8b5cf6",
  Glaucoma: "#10b981",
  Pharmacology: "#d946ef",
  "Practice Management": "#3b82f6",
  "Pediatrics & BV": "#ec4899",
  "ABO/CPC": "#3b82f6",
  General: "#64748b",
  Optical: "#f97316",
  "Contact Lenses": "#06b6d4",
  "Clinical Knowledge": "#84cc16",
  "Topical Diagnosis": "#14b8a6",
  "Ocular Disease": "#6366f1",
  "Systemic Disease": "#f97316",
  CPC: "#0ea5e9",
  CPO: "#0ea5e9",
  "ABO/CPO": "#0ea5e9",
  "Meal / Social": "#f59e0b",
};

export default function SessionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { isSaved, toggleSession } = useSchedule();
  const session = getSessionById(id);
  const isWeb = Platform.OS === "web";
  const { note, saveNote, loaded } = useNote(id ?? "");
  const noteRef = useRef<TextInput>(null);
  const [showMap, setShowMap] = useState(false);

  if (!session) {
    return (
      <View style={[styles.notFound, { backgroundColor: colors.background }]}>
        <Text style={[styles.notFoundText, { color: colors.mutedForeground }]}>
          Session not found
        </Text>
      </View>
    );
  }

  const speakers = getSpeakersForSession(session);
  const saved = isSaved(session.id);
  const trackColor = TRACK_COLORS[session.track] ?? colors.primary;

  const handleSave = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    toggleSession(session.id);
  };

  const handleSlides = () => {
    if (session.slidesUrl) {
      Linking.openURL(session.slidesUrl);
    }
  };

  return (
    <>
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={insets.top}
    >
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.container,
        {
          paddingTop: isWeb ? insets.top + 16 : 16,
          paddingBottom: isWeb ? insets.bottom + 40 : 120,
        },
      ]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Track badge */}
      <View style={styles.header}>
        <View style={[styles.trackBadge, { backgroundColor: trackColor + "20" }]}>
          <View style={[styles.trackDot, { backgroundColor: trackColor }]} />
          <Text style={[styles.trackText, { color: trackColor }]}>
            {session.track}
          </Text>
        </View>
      </View>

      <Text style={[styles.title, { color: colors.foreground }]}>
        {session.title}
      </Text>

      {/* Meta card */}
      <View style={[styles.metaCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <MetaRow icon="time-outline" label="Time" value={`${session.startTime} – ${session.endTime}`} colors={colors} />
        <MetaRow
          icon="location-outline"
          label="Room"
          value={session.room}
          colors={colors}
          valueColor={getRoomColor(session.room)}
          onPress={() => setShowMap(true)}
        />
        <MetaRow icon="calendar-outline" label="Day" value={session.day} colors={colors} />
        {session.copeId && (
          <MetaRow icon="school-outline" label="COPE" value={session.copeId} colors={colors} />
        )}
      </View>

      {/* Tags */}
      {session.tags && session.tags.length > 0 && (
        <View style={styles.tagsRow}>
          {session.tags.map((tag) => (
            <View key={tag} style={[styles.tag, { backgroundColor: colors.accent }]}>
              <Text style={[styles.tagText, { color: colors.accentForeground }]}>{tag}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Download Slides button */}
      <Pressable
        onPress={handleSlides}
        disabled={!session.slidesUrl}
        style={({ pressed }) => [
          styles.slidesButton,
          {
            backgroundColor: session.slidesUrl ? colors.primary + "15" : colors.muted,
            borderColor: session.slidesUrl ? colors.primary : colors.border,
            opacity: pressed ? 0.75 : 1,
          },
        ]}
      >
        <Ionicons
          name="document-text-outline"
          size={18}
          color={session.slidesUrl ? colors.primary : colors.mutedForeground}
        />
        <Text
          style={[
            styles.slidesButtonText,
            { color: session.slidesUrl ? colors.primary : colors.mutedForeground },
          ]}
        >
          {session.slidesUrl ? "Download Slides" : "Slides Coming Soon"}
        </Text>
        {session.slidesUrl && (
          <Ionicons name="open-outline" size={14} color={colors.primary} style={{ marginLeft: "auto" }} />
        )}
      </Pressable>

      {/* About */}
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
        About this session
      </Text>
      <Text style={[styles.description, { color: colors.foreground }]}>
        {session.description}
      </Text>

      {/* Speakers */}
      {speakers.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            {speakers.length === 1 ? "Speaker" : "Speakers"}
          </Text>
          {speakers.map((speaker) => (
            <Pressable
              key={speaker.id}
              onPress={() =>
                router.push({ pathname: "/speaker/[id]", params: { id: speaker.id } })
              }
              style={({ pressed }) => [
                styles.speakerRow,
                { backgroundColor: colors.card, borderColor: colors.border },
                pressed && { opacity: 0.85 },
              ]}
            >
              <View style={[styles.speakerAvatar, { backgroundColor: colors.accent }]}>
                <Text style={[styles.speakerInitial, { color: colors.primary }]}>
                  {speaker.name[0]}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.speakerName, { color: colors.foreground }]}>
                  {speaker.name}
                </Text>
                <Text style={[styles.speakerRole, { color: colors.mutedForeground }]}>
                  {speaker.title} · {speaker.company}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
            </Pressable>
          ))}
        </>
      )}

      {/* ── My Notes ─────────────────────────────────────────── */}
      <View style={styles.notesTitleRow}>
        <Ionicons name="create-outline" size={18} color={colors.primary} />
        <Text style={[styles.sectionTitle, { color: colors.foreground, marginBottom: 0 }]}>
          My Notes
        </Text>
      </View>

      <Pressable
        onPress={() => noteRef.current?.focus()}
        style={[
          styles.notesBox,
          {
            backgroundColor: colors.card,
            borderColor: note.trim() ? colors.primary + "60" : colors.border,
          },
        ]}
      >
        {!loaded ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <TextInput
            ref={noteRef}
            value={note}
            onChangeText={saveNote}
            placeholder="Tap to take notes for this session…"
            placeholderTextColor={colors.mutedForeground}
            multiline
            textAlignVertical="top"
            style={[styles.notesInput, { color: colors.foreground }]}
            scrollEnabled={false}
          />
        )}
        {note.trim().length > 0 && (
          <Text style={[styles.notesSaved, { color: colors.primary }]}>
            ✓ Saved
          </Text>
        )}
      </Pressable>
      <Text style={[styles.notesHint, { color: colors.mutedForeground }]}>
        Notes are saved to this device and available in My Notes.
      </Text>

      {/* Save to schedule */}
      <Pressable
        onPress={handleSave}
        style={({ pressed }) => [
          styles.saveButton,
          {
            backgroundColor: saved ? colors.primary : colors.card,
            borderColor: saved ? colors.primary : colors.border,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
      >
        <Ionicons
          name={saved ? "bookmark" : "bookmark-outline"}
          size={20}
          color={saved ? "#fff" : colors.primary}
        />
        <Text style={[styles.saveButtonText, { color: saved ? "#fff" : colors.primary }]}>
          {saved ? "Saved to My Schedule" : "Save to My Schedule"}
        </Text>
      </Pressable>
    </ScrollView>
    </KeyboardAvoidingView>
    <RoomMapModal
      room={session.room}
      visible={showMap}
      onClose={() => setShowMap(false)}
    />
    </>
  );
}

function MetaRow({
  icon,
  label,
  value,
  colors,
  valueColor,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  colors: any;
  valueColor?: string;
  onPress?: () => void;
}) {
  const inner = (
    <View style={[styles.metaRow, onPress && styles.metaRowTappable]}>
      <Ionicons name={icon} size={16} color={valueColor ?? colors.primary} />
      <Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>{label}</Text>
      {valueColor ? (
        <View style={styles.metaValueRow}>
          <View style={[styles.metaRoomDot, { backgroundColor: valueColor }]} />
          <Text style={[styles.metaValue, { color: valueColor, fontWeight: "700" }]}>{value}</Text>
          {onPress && <Ionicons name="map-outline" size={13} color={valueColor} style={{ marginLeft: 4 }} />}
        </View>
      ) : (
        <Text style={[styles.metaValue, { color: colors.foreground }]}>{value}</Text>
      )}
      {onPress && !valueColor && <Ionicons name="chevron-forward" size={14} color={colors.mutedForeground} />}
    </View>
  );
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
        {inner}
      </Pressable>
    );
  }
  return inner;
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, gap: 16 },
  notFound: { flex: 1, alignItems: "center", justifyContent: "center" },
  notFoundText: { fontSize: 16 },
  header: { marginTop: 4 },
  trackBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  trackDot: { width: 8, height: 8, borderRadius: 4 },
  trackText: { fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  title: { fontSize: 26, fontWeight: "800", letterSpacing: -0.3, lineHeight: 34 },
  metaCard: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 12 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  metaRowTappable: { paddingVertical: 2 },
  metaLabel: { fontSize: 13, width: 48 },
  metaValue: { fontSize: 14, fontWeight: "500", flex: 1 },
  metaValueRow: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1 },
  metaRoomDot: { width: 9, height: 9, borderRadius: 5 },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  tagText: { fontSize: 12, fontWeight: "500" },
  slidesButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingVertical: 13,
    paddingHorizontal: 16,
  },
  slidesButtonText: { fontSize: 14, fontWeight: "600" },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: -4 },
  description: { fontSize: 15, lineHeight: 24 },
  speakerRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  speakerAvatar: {
    width: 46, height: 46, borderRadius: 23,
    alignItems: "center", justifyContent: "center",
  },
  speakerInitial: { fontSize: 18, fontWeight: "700" },
  speakerName: { fontSize: 15, fontWeight: "600" },
  speakerRole: { fontSize: 12, marginTop: 2 },
  notesTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  notesBox: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 14,
    minHeight: 130,
  },
  notesInput: {
    fontSize: 15,
    lineHeight: 23,
    minHeight: 100,
  },
  notesSaved: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 6,
    textAlign: "right",
  },
  notesHint: {
    fontSize: 12,
    marginTop: -8,
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingVertical: 16,
    marginTop: 4,
  },
  saveButtonText: { fontSize: 15, fontWeight: "700" },
});
