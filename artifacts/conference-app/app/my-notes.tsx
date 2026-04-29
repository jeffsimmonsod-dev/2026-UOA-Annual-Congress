import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system";
import { router, useFocusEffect } from "expo-router";
import * as Sharing from "expo-sharing";
import React, { useCallback, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { deleteNote, getAllNotes } from "@/hooks/useNotes";
import { useColors } from "@/hooks/useColors";
import { useTabletLayout } from "@/hooks/useTabletLayout";
import { getSessionById } from "@/services/data";

interface NoteEntry {
  sessionId: string;
  note: string;
  title: string;
  day: string;
  startTime: string;
  endTime: string;
  room: string;
}

const DAY_ORDER = ["Thursday", "Friday", "Saturday", "Sunday"];

function dayRank(day: string) {
  const i = DAY_ORDER.indexOf(day);
  return i === -1 ? 999 : i;
}

function buildNotesText(notes: NoteEntry[]): string {
  const days = [...new Set(notes.map((n) => n.day))].sort(
    (a, b) => dayRank(a) - dayRank(b)
  );
  const date = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const lines: string[] = [
    "2026 UOA Annual Congress — My Notes",
    `Downloaded: ${date}`,
    "",
  ];

  for (const day of days) {
    lines.push(`${"═".repeat(40)}`);
    lines.push(day.toUpperCase());
    lines.push(`${"═".repeat(40)}`);
    lines.push("");

    for (const entry of notes.filter((n) => n.day === day)) {
      lines.push(entry.title);
      const meta = [
        entry.startTime && entry.endTime
          ? `${entry.startTime} – ${entry.endTime}`
          : entry.startTime,
        entry.room,
      ]
        .filter(Boolean)
        .join(" · ");
      if (meta) lines.push(meta);
      lines.push("-".repeat(32));
      lines.push(entry.note);
      lines.push("");
    }
  }

  return lines.join("\n");
}

async function downloadNotes(notes: NoteEntry[]) {
  const text = buildNotesText(notes);
  const filename = "UOA-Congress-2026-Notes.txt";

  if (Platform.OS === "web") {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }

  const path = `${FileSystem.cacheDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(path, text, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  const available = await Sharing.isAvailableAsync();
  if (available) {
    await Sharing.shareAsync(path, {
      mimeType: "text/plain",
      dialogTitle: "Save your notes",
      UTI: "public.plain-text",
    });
  } else {
    Alert.alert("Sharing not available", "Unable to share files on this device.");
  }
}

export default function MyNotesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { contentStyle } = useTabletLayout();
  const [notes, setNotes] = useState<NoteEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  const loadNotes = useCallback(async () => {
    setLoading(true);
    const raw = await getAllNotes();
    const entries: NoteEntry[] = raw.map(({ sessionId, note }) => {
      const session = getSessionById(sessionId);
      return {
        sessionId,
        note,
        title: session?.title ?? sessionId,
        day: session?.day ?? "Other",
        startTime: session?.startTime ?? "",
        endTime: session?.endTime ?? "",
        room: session?.room ?? "",
      };
    });
    entries.sort((a, b) => {
      if (dayRank(a.day) !== dayRank(b.day)) return dayRank(a.day) - dayRank(b.day);
      return a.startTime.localeCompare(b.startTime);
    });
    setNotes(entries);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadNotes();
    }, [loadNotes])
  );

  const handleDelete = (entry: NoteEntry) => {
    Alert.alert(
      "Delete Note",
      `Delete your note for "${entry.title}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteNote(entry.sessionId);
            setNotes((prev) => prev.filter((n) => n.sessionId !== entry.sessionId));
          },
        },
      ]
    );
  };

  const handleDownload = async () => {
    if (notes.length === 0) return;
    setDownloading(true);
    try {
      await downloadNotes(notes);
    } catch {
      Alert.alert("Error", "Could not export notes. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  const days = [...new Set(notes.map((n) => n.day))].sort(
    (a, b) => dayRank(a) - dayRank(b)
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Nav header */}
      <View
        style={[
          styles.navHeader,
          {
            paddingTop: insets.top + 12,
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </Pressable>
        <Text style={[styles.navTitle, { color: colors.foreground }]}>My Notes</Text>
        {notes.length > 0 ? (
          <Pressable
            onPress={handleDownload}
            disabled={downloading}
            style={styles.downloadBtn}
            hitSlop={8}
          >
            <Ionicons
              name={downloading ? "hourglass-outline" : "download-outline"}
              size={22}
              color={downloading ? colors.mutedForeground : colors.primary}
            />
          </Pressable>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      <ScrollView
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={[
          styles.container,
          { paddingTop: 20, paddingBottom: insets.bottom + 100 },
          contentStyle,
        ]}
        showsVerticalScrollIndicator={false}
      >
        {loading ? null : notes.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="create-outline" size={52} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No notes yet</Text>
            <Text style={[styles.emptyBody, { color: colors.mutedForeground }]}>
              Open any session and use the{"\n"}My Notes section to start writing.
            </Text>
            <Pressable
              onPress={() => router.push("/(tabs)/schedule")}
              style={({ pressed }) => [
                styles.emptyButton,
                { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Text style={styles.emptyButtonText}>Browse Schedule</Text>
            </Pressable>
          </View>
        ) : (
          <View>
            <Text style={[styles.countLabel, { color: colors.mutedForeground }]}>
              {notes.length} session{notes.length !== 1 ? "s" : ""} with notes
            </Text>

            {days.map((day) => (
              <View key={day} style={styles.daySection}>
                <View style={styles.dayHeader}>
                  <View style={[styles.dayDot, { backgroundColor: colors.primary }]} />
                  <Text style={[styles.dayLabel, { color: colors.primary }]}>{day}</Text>
                </View>

                {notes
                  .filter((n) => n.day === day)
                  .map((entry) => (
                    <Pressable
                      key={entry.sessionId}
                      onPress={() =>
                        router.push({
                          pathname: "/session/[id]",
                          params: { id: entry.sessionId },
                        })
                      }
                      style={({ pressed }) => [
                        styles.noteCard,
                        {
                          backgroundColor: colors.card,
                          borderColor: colors.border,
                          opacity: pressed ? 0.88 : 1,
                        },
                      ]}
                    >
                      <View style={styles.noteCardHeader}>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={[styles.sessionTitle, { color: colors.foreground }]}
                            numberOfLines={2}
                          >
                            {entry.title}
                          </Text>
                          {entry.startTime ? (
                            <Text style={[styles.sessionMeta, { color: colors.mutedForeground }]}>
                              {entry.startTime}
                              {entry.endTime ? ` – ${entry.endTime}` : ""}
                              {entry.room ? ` · ${entry.room}` : ""}
                            </Text>
                          ) : null}
                        </View>
                        <Pressable
                          onPress={() => handleDelete(entry)}
                          hitSlop={12}
                          style={styles.deleteBtn}
                        >
                          <Ionicons
                            name="trash-outline"
                            size={16}
                            color={colors.mutedForeground}
                          />
                        </Pressable>
                      </View>

                      <View
                        style={[styles.noteDivider, { backgroundColor: colors.border }]}
                      />

                      <Text
                        style={[styles.noteText, { color: colors.foreground }]}
                        numberOfLines={6}
                      >
                        {entry.note}
                      </Text>

                      <View style={styles.openRow}>
                        <Text style={[styles.openLabel, { color: colors.primary }]}>
                          Tap to open & edit
                        </Text>
                        <Ionicons name="chevron-forward" size={13} color={colors.primary} />
                      </View>
                    </Pressable>
                  ))}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  navHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 40, alignItems: "flex-start" },
  navTitle: { flex: 1, fontSize: 18, fontWeight: "700", textAlign: "center" },
  downloadBtn: { width: 40, alignItems: "flex-end" },
  container: { paddingHorizontal: 16 },
  emptyState: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyTitle: { fontSize: 20, fontWeight: "700", marginTop: 8 },
  emptyBody: { fontSize: 14, lineHeight: 22, textAlign: "center" },
  emptyButton: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 28,
    marginTop: 8,
  },
  emptyButtonText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  countLabel: { fontSize: 13, marginBottom: 8 },
  daySection: { marginBottom: 12 },
  dayHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
    marginBottom: 10,
  },
  dayDot: { width: 8, height: 8, borderRadius: 4 },
  dayLabel: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  noteCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  noteCardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 10,
  },
  sessionTitle: { fontSize: 14, fontWeight: "700", lineHeight: 20 },
  sessionMeta: { fontSize: 12, marginTop: 2 },
  deleteBtn: { padding: 4 },
  noteDivider: { height: StyleSheet.hairlineWidth, marginBottom: 10 },
  noteText: { fontSize: 14, lineHeight: 21, marginBottom: 10 },
  openRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  openLabel: { fontSize: 12, fontWeight: "600" },
});
