import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import { Alert, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSchedule } from "@/context/ScheduleContext";
import { useColors } from "@/hooks/useColors";
import type { Session } from "@/types";
import { getSpeakersForSession } from "@/services/data";

interface Props {
  session: Session;
  showDay?: boolean;
}

const TRACK_COLORS: Record<string, string> = {
  "Retinal Disease": "#ef4444",
  "Neuro-Optometry": "#8b5cf6",
  Glaucoma: "#10b981",
  Pharmacology: "#f59e0b",
  "Practice Management": "#3b82f6",
  "Pediatrics & BV": "#ec4899",
  "Topical Diagnosis": "#14b8a6",
  "Ocular Disease": "#6366f1",
  "Systemic Disease": "#f97316",
  "ABO/CPC": "#0ea5e9",
  General: "#6b7280",
  Optical: "#a855f7",
  "Clinical Knowledge": "#84cc16",
  "Contact Lenses": "#06b6d4",
};

export default function SessionCard({ session, showDay = false }: Props) {
  const colors = useColors();
  const { isSaved, toggleSession, checkConflict } = useSchedule();
  const saved = isSaved(session.id);
  const speakers = getSpeakersForSession(session);
  const trackColor = TRACK_COLORS[session.track] ?? colors.primary;
  const [conflictSession, setConflictSession] = useState<Session | null>(null);

  const handlePress = () => {
    router.push({ pathname: "/session/[id]", params: { id: session.id } });
  };

  const handleSave = (e: any) => {
    e.stopPropagation?.();
    if (saved) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      toggleSession(session.id);
      return;
    }
    const conflict = checkConflict(session.id);
    if (conflict) {
      setConflictSession(conflict);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      toggleSession(session.id);
    }
  };

  const confirmOverride = () => {
    setConflictSession(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    toggleSession(conflictSession!.id);
    toggleSession(session.id);
  };

  return (
    <>
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.border },
          pressed && { opacity: 0.85 },
        ]}
      >
        <View style={[styles.trackBar, { backgroundColor: trackColor }]} />
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={[styles.trackBadge, { backgroundColor: trackColor + "22" }]}>
              <Text style={[styles.trackText, { color: trackColor }]}>
                {session.track}
              </Text>
            </View>
            <Pressable onPress={handleSave} hitSlop={10}>
              <Ionicons
                name={saved ? "bookmark" : "bookmark-outline"}
                size={20}
                color={saved ? colors.primary : colors.mutedForeground}
              />
            </Pressable>
          </View>

          <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={2}>
            {session.title}
          </Text>

          <View style={styles.meta}>
            <View style={styles.metaRow}>
              <Ionicons name="time-outline" size={13} color={colors.mutedForeground} />
              <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                {session.startTime} – {session.endTime}
              </Text>
            </View>
            <View style={styles.metaRow}>
              <Ionicons name="location-outline" size={13} color={colors.mutedForeground} />
              <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                {session.room}
              </Text>
            </View>
            {showDay && (
              <View style={styles.metaRow}>
                <Ionicons name="calendar-outline" size={13} color={colors.mutedForeground} />
                <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                  {session.day}
                </Text>
              </View>
            )}
          </View>

          {speakers.length > 0 && (
            <Text style={[styles.speaker, { color: colors.mutedForeground }]}>
              {speakers.map((sp) => sp.name).join(", ")}
            </Text>
          )}
        </View>
      </Pressable>

      <Modal
        visible={!!conflictSession}
        transparent
        animationType="fade"
        onRequestClose={() => setConflictSession(null)}
      >
        <Pressable style={styles.overlay} onPress={() => setConflictSession(null)}>
          <Pressable style={[styles.conflictModal, { backgroundColor: colors.card }]} onPress={() => {}}>
            <View style={[styles.conflictIconWrap, { backgroundColor: "#fef3c7" }]}>
              <Ionicons name="warning-outline" size={28} color="#d97706" />
            </View>
            <Text style={[styles.conflictTitle, { color: colors.foreground }]}>
              Schedule Conflict
            </Text>
            <Text style={[styles.conflictBody, { color: colors.mutedForeground }]}>
              This session overlaps with a session already in your schedule:
            </Text>
            <View style={[styles.conflictSessionBox, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <Text style={[styles.conflictSessionTitle, { color: colors.foreground }]} numberOfLines={2}>
                {conflictSession?.title}
              </Text>
              <Text style={[styles.conflictSessionTime, { color: colors.mutedForeground }]}>
                {conflictSession?.startTime} – {conflictSession?.endTime} · {conflictSession?.room}
              </Text>
            </View>
            <Text style={[styles.conflictBody, { color: colors.mutedForeground }]}>
              Would you like to swap — removing the conflicting session and adding this one instead?
            </Text>
            <View style={styles.conflictActions}>
              <Pressable
                style={[styles.conflictBtn, styles.conflictBtnCancel, { borderColor: colors.border }]}
                onPress={() => setConflictSession(null)}
              >
                <Text style={[styles.conflictBtnText, { color: colors.foreground }]}>Keep Existing</Text>
              </Pressable>
              <Pressable
                style={[styles.conflictBtn, styles.conflictBtnConfirm, { backgroundColor: colors.primary }]}
                onPress={confirmOverride}
              >
                <Text style={[styles.conflictBtnText, { color: "#fff" }]}>Swap Sessions</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    overflow: "hidden",
    marginBottom: 12,
  },
  trackBar: {
    width: 4,
  },
  content: {
    flex: 1,
    padding: 14,
    gap: 8,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  trackBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  trackText: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 21,
  },
  meta: {
    gap: 4,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  metaText: {
    fontSize: 12,
  },
  speaker: {
    fontSize: 12,
    fontStyle: "italic",
    marginTop: 2,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  conflictModal: {
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 380,
    alignItems: "center",
    gap: 12,
  },
  conflictIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  conflictTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  conflictBody: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  conflictSessionBox: {
    width: "100%",
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 4,
  },
  conflictSessionTitle: {
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },
  conflictSessionTime: {
    fontSize: 12,
  },
  conflictActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
    width: "100%",
  },
  conflictBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  conflictBtnCancel: {
    borderWidth: 1,
  },
  conflictBtnConfirm: {},
  conflictBtnText: {
    fontSize: 14,
    fontWeight: "700",
  },
});
