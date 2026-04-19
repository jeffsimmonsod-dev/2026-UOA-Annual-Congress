import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Modal,
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
import { useProfile } from "@/context/ProfileContext";

export default function OnboardingModal() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile, profileLoaded, saveProfile } = useProfile();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState("");

  const visible = profileLoaded && !profile;

  const handleSubmit = async () => {
    if (!name.trim()) {
      setNameError("Please enter your name so we can track your passport.");
      return;
    }
    setNameError("");
    setSaving(true);
    await saveProfile({ name: name.trim(), email: email.trim() });
    setSaving(false);
  };

  return (
    <Modal visible={visible} animationType="fade" statusBarTranslucent>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: colors.background }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={[
            styles.container,
            { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 40 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Image
            source={require("../assets/images/uoa-logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />

          <View style={styles.welcomeBlock}>
            <Text style={[styles.welcomeTitle, { color: colors.foreground }]}>
              Welcome to the{"\n"}2026 UOA Annual Congress
            </Text>
            <Text style={[styles.welcomeSubtitle, { color: colors.mutedForeground }]}>
              June 4–7 · Grand Hyatt Deer Valley
            </Text>
          </View>

          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconWrap, { backgroundColor: colors.primary + "15" }]}>
                <Ionicons name="person-circle-outline" size={28} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, { color: colors.foreground }]}>
                  Tell us who you are
                </Text>
                <Text style={[styles.cardSubtitle, { color: colors.mutedForeground }]}>
                  Used for your exhibit hall passport and raffle entry. Only asked once.
                </Text>
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.foreground }]}>
                Your Name <Text style={{ color: colors.primary }}>*</Text>
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.muted,
                    color: colors.foreground,
                    borderColor: nameError ? "#ef4444" : colors.border,
                  },
                ]}
                placeholder="e.g. Jane Smith, OD"
                placeholderTextColor={colors.mutedForeground}
                value={name}
                onChangeText={(t) => { setName(t); setNameError(""); }}
                autoCapitalize="words"
                returnKeyType="next"
                autoFocus
              />
              {nameError ? (
                <Text style={styles.errorText}>{nameError}</Text>
              ) : null}
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.foreground }]}>
                Email Address{" "}
                <Text style={[styles.optional, { color: colors.mutedForeground }]}>
                  (optional)
                </Text>
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.muted,
                    color: colors.foreground,
                    borderColor: colors.border,
                  },
                ]}
                placeholder="jane@example.com"
                placeholderTextColor={colors.mutedForeground}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
              />
              <Text style={[styles.emailHint, { color: colors.mutedForeground }]}>
                Allows sponsors to follow up and helps us contact raffle winners
              </Text>
            </View>

            <Pressable
              onPress={handleSubmit}
              disabled={saving}
              style={({ pressed }) => [
                styles.submitBtn,
                { backgroundColor: colors.primary, opacity: pressed || saving ? 0.8 : 1 },
              ]}
            >
              <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
              <Text style={styles.submitBtnText}>
                {saving ? "Saving..." : "Get Started"}
              </Text>
            </Pressable>
          </View>

          <View style={styles.featureList}>
            {[
              { icon: "map-outline", text: "Scan exhibitor booths to earn your passport" },
              { icon: "notifications-outline", text: "Receive real-time announcements" },
              { icon: "camera-outline", text: "Share photos from the event" },
            ].map((item) => (
              <View key={item.text} style={styles.featureRow}>
                <View style={[styles.featureIcon, { backgroundColor: colors.accent }]}>
                  <Ionicons name={item.icon as any} size={16} color={colors.primary} />
                </View>
                <Text style={[styles.featureText, { color: colors.mutedForeground }]}>
                  {item.text}
                </Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    alignItems: "center",
    gap: 24,
  },
  logo: {
    width: 220,
    height: 120,
  },
  welcomeBlock: {
    alignItems: "center",
    gap: 6,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
    lineHeight: 32,
    letterSpacing: -0.5,
  },
  welcomeSubtitle: {
    fontSize: 14,
    textAlign: "center",
  },
  card: {
    width: "100%",
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    gap: 16,
  },
  cardHeader: {
    flexDirection: "row",
    gap: 14,
    alignItems: "flex-start",
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 12,
    lineHeight: 18,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  optional: {
    fontWeight: "400",
    fontSize: 12,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
  },
  errorText: {
    color: "#ef4444",
    fontSize: 12,
  },
  emailHint: {
    fontSize: 11,
    lineHeight: 16,
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 15,
    borderRadius: 14,
    marginTop: 4,
  },
  submitBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  featureList: {
    width: "100%",
    gap: 10,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  featureIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  featureText: {
    fontSize: 13,
    flex: 1,
  },
});
