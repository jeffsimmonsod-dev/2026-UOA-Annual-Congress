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
  const [emailConsent, setEmailConsent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState("");
  const [emailError, setEmailError] = useState("");

  const visible = profileLoaded && !profile;

  const validateEmail = (val: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
  };

  const handleSubmit = async () => {
    let valid = true;
    if (!name.trim()) {
      setNameError("Please enter your name so we can track your passport.");
      valid = false;
    } else {
      setNameError("");
    }
    if (!email.trim()) {
      setEmailError("Email is required to complete registration.");
      valid = false;
    } else if (!validateEmail(email)) {
      setEmailError("Please enter a valid email address.");
      valid = false;
    } else {
      setEmailError("");
    }
    if (!valid) return;

    setSaving(true);
    await saveProfile({ name: name.trim(), email: email.trim(), emailConsent });
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

          {/* Profile card */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconWrap, { backgroundColor: colors.primary + "15" }]}>
                <Ionicons name="person-circle-outline" size={28} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, { color: colors.foreground }]}>
                  Create your attendee profile
                </Text>
                <Text style={[styles.cardSubtitle, { color: colors.mutedForeground }]}>
                  Used for your exhibit hall passport and raffle entry. Asked only once.
                </Text>
              </View>
            </View>

            {/* Name */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.foreground }]}>
                Your Name <Text style={{ color: "#ef4444" }}>*</Text>
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
              {nameError ? <Text style={styles.errorText}>{nameError}</Text> : null}
            </View>

            {/* Email */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.foreground }]}>
                Email Address <Text style={{ color: "#ef4444" }}>*</Text>
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.muted,
                    color: colors.foreground,
                    borderColor: emailError ? "#ef4444" : colors.border,
                  },
                ]}
                placeholder="jane@example.com"
                placeholderTextColor={colors.mutedForeground}
                value={email}
                onChangeText={(t) => { setEmail(t); setEmailError(""); }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
              />
              {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
            </View>

            {/* Consent toggle */}
            <Pressable
              onPress={() => setEmailConsent((v) => !v)}
              style={[
                styles.consentRow,
                {
                  backgroundColor: emailConsent ? colors.primary + "12" : colors.muted,
                  borderColor: emailConsent ? colors.primary : colors.border,
                },
              ]}
            >
              <View
                style={[
                  styles.checkbox,
                  {
                    borderColor: emailConsent ? colors.primary : colors.mutedForeground,
                    backgroundColor: emailConsent ? colors.primary : "transparent",
                  },
                ]}
              >
                {emailConsent && <Ionicons name="checkmark" size={13} color="#fff" />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.consentTitle, { color: colors.foreground }]}>
                  Share my contact info with vendor reps
                </Text>
                <Text style={[styles.consentSub, { color: colors.mutedForeground }]}>
                  Allows sponsor representatives to follow up with you after the event. You can still participate in the passport program without consenting.
                </Text>
              </View>
            </Pressable>

            {/* Submit */}
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

          {/* Feature list */}
          <View style={styles.featureList}>
            {[
              { icon: "map-outline", text: "Scan exhibitor booths to earn your passport" },
              { icon: "trophy-outline", text: "Complete your passport for raffle entry" },
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
  consentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
    flexShrink: 0,
  },
  consentTitle: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 3,
  },
  consentSub: {
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
  declineBtn: {
    alignItems: "center",
    paddingVertical: 4,
    marginTop: -8,
  },
  declineBtnText: {
    fontSize: 12,
    textDecorationLine: "underline",
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
