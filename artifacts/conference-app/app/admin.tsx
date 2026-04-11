import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Alert,
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
import { useColors } from "@/hooks/useColors";
import { sendPushNotification } from "@/services/pushNotifications";

type Step = "pin" | "compose";

export default function AdminScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";

  const [step, setStep] = useState<Step>("pin");
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const CORRECT_PIN = "UOA2026";

  const handlePinSubmit = () => {
    if (pin === CORRECT_PIN) {
      setPinError("");
      setStep("compose");
    } else {
      setPinError("Incorrect PIN. Try again.");
      setPin("");
    }
  };

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) {
      Alert.alert("Missing fields", "Please enter both a title and a message.");
      return;
    }
    setSending(true);
    const result = await sendPushNotification(title.trim(), body.trim(), CORRECT_PIN);
    setSending(false);
    if (result.success) {
      Alert.alert("Sent!", result.message, [
        {
          text: "OK",
          onPress: () => {
            setTitle("");
            setBody("");
          },
        },
      ]);
    } else {
      Alert.alert("Error", result.message);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={[
          styles.container,
          {
            paddingTop: isWeb ? insets.top + 24 : 24,
            paddingBottom: isWeb ? insets.bottom + 60 : 60,
          },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.header, { backgroundColor: colors.primary + "12", borderColor: colors.primary + "25" }]}>
          <Ionicons name="megaphone-outline" size={24} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>
              Send Announcement
            </Text>
            <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
              Push notification to all registered attendees
            </Text>
          </View>
        </View>

        {step === "pin" ? (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.label, { color: colors.foreground }]}>
              Admin PIN
            </Text>
            <Text style={[styles.hint, { color: colors.mutedForeground }]}>
              Enter the UOA admin PIN to access this feature.
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.muted,
                  color: colors.foreground,
                  borderColor: pinError ? "#ef4444" : colors.border,
                },
              ]}
              placeholder="Enter PIN"
              placeholderTextColor={colors.mutedForeground}
              value={pin}
              onChangeText={setPin}
              secureTextEntry
              keyboardType="default"
              returnKeyType="go"
              onSubmitEditing={handlePinSubmit}
              autoFocus
            />
            {pinError ? (
              <Text style={styles.errorText}>{pinError}</Text>
            ) : null}
            <Pressable
              onPress={handlePinSubmit}
              style={[styles.button, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.buttonText}>Continue</Text>
              <Ionicons name="arrow-forward" size={16} color="#fff" />
            </Pressable>
          </View>
        ) : (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.label, { color: colors.foreground }]}>
              Announcement Title
            </Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border },
              ]}
              placeholder="e.g., Lunch is now being served"
              placeholderTextColor={colors.mutedForeground}
              value={title}
              onChangeText={setTitle}
              returnKeyType="next"
              maxLength={80}
            />
            <Text style={[styles.label, { color: colors.foreground, marginTop: 8 }]}>
              Message
            </Text>
            <TextInput
              style={[
                styles.textArea,
                { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border },
              ]}
              placeholder="Detailed message for attendees..."
              placeholderTextColor={colors.mutedForeground}
              value={body}
              onChangeText={setBody}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={300}
            />
            <Text style={[styles.charCount, { color: colors.mutedForeground }]}>
              {body.length}/300
            </Text>

            <View style={styles.quickFills}>
              <Text style={[styles.quickFillLabel, { color: colors.mutedForeground }]}>
                Quick fill:
              </Text>
              {[
                { t: "Lunch Now Served", b: "Lunch is now being served in the Grand Ballroom. Please make your way to the dining area." },
                { t: "Session Starting Soon", b: "The next CE session begins in 5 minutes. Please make your way to your assigned room." },
                { t: "Exhibitor Hall Open", b: "The exhibitor hall is now open! Visit our sponsors and partners in the main exhibit area." },
              ].map((q) => (
                <Pressable
                  key={q.t}
                  onPress={() => { setTitle(q.t); setBody(q.b); }}
                  style={[styles.quickFillChip, { backgroundColor: colors.accent, borderColor: colors.border }]}
                >
                  <Text style={[styles.quickFillText, { color: colors.primary }]}>{q.t}</Text>
                </Pressable>
              ))}
            </View>

            <Pressable
              onPress={handleSend}
              disabled={sending}
              style={[
                styles.button,
                { backgroundColor: sending ? colors.muted : colors.primary },
              ]}
            >
              <Ionicons name="send-outline" size={16} color={sending ? colors.mutedForeground : "#fff"} />
              <Text style={[styles.buttonText, { color: sending ? colors.mutedForeground : "#fff" }]}>
                {sending ? "Sending..." : "Send to All Attendees"}
              </Text>
            </Pressable>

            <Pressable onPress={() => { setStep("pin"); setPin(""); }}>
              <Text style={[styles.backLink, { color: colors.mutedForeground }]}>
                ← Back
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    gap: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  headerSub: {
    fontSize: 12,
    marginTop: 2,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    gap: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
  },
  hint: {
    fontSize: 13,
    lineHeight: 20,
  },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  textArea: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    minHeight: 100,
  },
  charCount: {
    fontSize: 11,
    textAlign: "right",
    marginTop: -8,
  },
  errorText: {
    color: "#ef4444",
    fontSize: 13,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 4,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: "700",
  },
  quickFills: {
    gap: 8,
  },
  quickFillLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  quickFillChip: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  quickFillText: {
    fontSize: 13,
    fontWeight: "500",
  },
  backLink: {
    fontSize: 13,
    textAlign: "center",
    marginTop: 4,
  },
});
