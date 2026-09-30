import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { useSchedule } from "@/context/ScheduleContext";

export default function MissingSessionCard({ sessionId }: { sessionId: string }) {
  const colors = useColors();
  const { toggleSession } = useSchedule();

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.heading}>
        <Ionicons name="alert-circle-outline" size={20} color={colors.warning} />
        <Text style={[styles.title, { color: colors.foreground }]}>Session not found</Text>
      </View>
      <Text style={[styles.description, { color: colors.mutedForeground }]}>
        This saved session (ID: {sessionId}) is not in the currently available schedule. It may have been removed, re-imported with a different ID, or temporarily unavailable.
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Remove missing session ${sessionId} from My Schedule`}
        testID={`remove-missing-session-${sessionId}`}
        onPress={() => toggleSession(sessionId)}
        style={styles.remove}
      >
        <Ionicons name="bookmark-outline" size={16} color={colors.primary} />
        <Text style={[styles.removeText, { color: colors.primary }]}>Remove bookmark</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 12, padding: 16, marginBottom: 12, gap: 10 },
  heading: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontSize: 16, fontWeight: "700" },
  description: { fontSize: 14, lineHeight: 20 },
  remove: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 6, alignSelf: "flex-start" },
  removeText: { fontSize: 14, fontWeight: "600" },
});