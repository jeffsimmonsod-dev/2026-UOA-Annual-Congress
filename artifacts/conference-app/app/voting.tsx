import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useTabletLayout } from "@/hooks/useTabletLayout";
import { getDeviceId } from "@/services/deviceId";

const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

const OFFICER_SLATE = [
  { role: "President", name: "Dr. Jeff Simmons" },
  { role: "President-Elect", name: "Dr. Collin Gray" },
  { role: "Past President", name: "Dr. Kenyon Anderson" },
  { role: "VP Legislation", name: "Dr. Court Wilkins" },
  { role: "VP Finance", name: "Dr. Kyle Wilson" },
];

const TRUSTEE_CANDIDATES = [
  "Dr. Steven Blake",
  "Dr. Aaron King",
  "Dr. Jonathon King",
  "Dr. Taylor Linton",
];

type SlateVote = "approve" | "disapprove" | "abstain";

type PageState = "loading" | "closed" | "vote" | "already_voted" | "submitted";

export default function VotingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { contentStyle } = useTabletLayout();
  const isWeb = Platform.OS === "web";

  const [pageState, setPageState] = useState<PageState>("loading");
  const [slateVote, setSlateVote] = useState<SlateVote | null>(null);
  const [selectedTrustees, setSelectedTrustees] = useState<string[]>([]);
  const [slateError, setSlateError] = useState(false);
  const [trusteeError, setTrusteeError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const deviceIdRef = useRef<string>("");

  useEffect(() => {
    async function init() {
      const deviceId = await getDeviceId();
      deviceIdRef.current = deviceId;
      try {
        const [stateRes, statusRes] = await Promise.all([
          fetch(`${API_BASE}/api/voting/state`),
          fetch(`${API_BASE}/api/voting/status/${encodeURIComponent(deviceId)}`),
        ]);
        const stateData = await stateRes.json();
        const statusData = await statusRes.json();

        if (statusData.hasVoted) {
          setPageState("already_voted");
        } else if (!stateData.isOpen) {
          setPageState("closed");
        } else {
          setPageState("vote");
        }
      } catch {
        setPageState("closed");
      }
    }
    init();
  }, []);

  const toggleTrustee = (candidate: string) => {
    setTrusteeError(false);
    setSelectedTrustees((prev) => {
      if (prev.includes(candidate)) {
        return prev.filter((c) => c !== candidate);
      }
      if (prev.length >= 3) {
        setTrusteeError(true);
        return prev;
      }
      return [...prev, candidate];
    });
  };

  const handleSubmit = async () => {
    let hasError = false;
    if (!slateVote) {
      setSlateError(true);
      hasError = true;
    }
    if (hasError) return;

    setSubmitError("");
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/voting/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId: deviceIdRef.current,
          slateVote,
          trusteeVotes: selectedTrustees,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setPageState("submitted");
      } else if (res.status === 409) {
        setPageState("already_voted");
      } else if (res.status === 403) {
        setPageState("closed");
      } else {
        setSubmitError(data.error || "Could not submit your vote. Please try again.");
      }
    } catch {
      setSubmitError("Could not reach the server. Check your connection.");
    }
    setSubmitting(false);
  };

  const SLATE_OPTIONS: { value: SlateVote; label: string }[] = [
    { value: "approve", label: "Approve officer slate" },
    { value: "disapprove", label: "Do not approve officer slate" },
    { value: "abstain", label: "Abstain" },
  ];

  if (pageState === "loading") {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (pageState === "closed") {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <View style={[styles.statusCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.statusIcon, { backgroundColor: "#64748b18" }]}>
            <Ionicons name="lock-closed-outline" size={32} color="#64748b" />
          </View>
          <Text style={[styles.statusTitle, { color: colors.foreground }]}>Voting is Closed</Text>
          <Text style={[styles.statusDesc, { color: colors.mutedForeground }]}>
            Voting is not currently open. Please check back during the Business Meeting.
          </Text>
          <Pressable
            onPress={() => router.back()}
            style={[styles.backBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}
          >
            <Ionicons name="arrow-back" size={16} color={colors.foreground} />
            <Text style={[styles.backBtnText, { color: colors.foreground }]}>Go Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (pageState === "already_voted" || pageState === "submitted") {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <View style={[styles.statusCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.statusIcon, { backgroundColor: colors.primary + "18" }]}>
            <Ionicons name="checkmark-circle" size={40} color={colors.primary} />
          </View>
          <Text style={[styles.statusTitle, { color: colors.foreground }]}>
            {pageState === "submitted" ? "Vote Submitted!" : "Already Voted"}
          </Text>
          <Text style={[styles.statusDesc, { color: colors.mutedForeground }]}>
            {pageState === "submitted"
              ? "Your ballot has been recorded. Thank you for participating in the 2026 UOA Business Meeting."
              : "Your vote has already been submitted from this device."}
          </Text>
          <Pressable
            onPress={() => router.back()}
            style={[styles.backBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}
          >
            <Ionicons name="arrow-back" size={16} color={colors.foreground} />
            <Text style={[styles.backBtnText, { color: colors.foreground }]}>Go Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.container,
        {
          paddingTop: isWeb ? insets.top + 16 : 16,
          paddingBottom: insets.bottom + 100,
        },
        contentStyle,
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={[styles.backPill, { backgroundColor: colors.muted }]}
        >
          <Ionicons name="arrow-back" size={16} color={colors.foreground} />
          <Text style={[styles.backPillText, { color: colors.foreground }]}>Back</Text>
        </Pressable>
        <Text style={[styles.pageTitle, { color: colors.foreground }]}>
          Business Meeting Voting
        </Text>
        <Text style={[styles.pageSubtitle, { color: colors.mutedForeground }]}>
          2026 UOA Annual Congress · June 4–7, 2026
        </Text>
      </View>

      {/* ── SECTION 1: Officer Slate ── */}
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionBadge, { backgroundColor: colors.primary + "15" }]}>
            <Ionicons name="people-outline" size={18} color={colors.primary} />
          </View>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Officer Slate</Text>
        </View>
        <Text style={[styles.sectionDesc, { color: colors.mutedForeground }]}>
          The following officers have been nominated for the 2026–2027 term. No nominations will be accepted from the floor.
        </Text>

        <View style={[styles.slateList, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          {OFFICER_SLATE.map((officer) => (
            <View key={officer.role} style={[styles.slateRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.slateRole, { color: colors.mutedForeground }]}>{officer.role}</Text>
              <Text style={[styles.slateName, { color: colors.foreground }]}>{officer.name}</Text>
            </View>
          ))}
        </View>

        <Text style={[styles.fieldLabel, { color: colors.foreground, marginTop: 16 }]}>
          Your vote <Text style={{ color: colors.primary }}>*</Text>
        </Text>
        {slateError && (
          <Text style={styles.errorText}>Please select one option before submitting.</Text>
        )}
        <View style={styles.radioGroup}>
          {SLATE_OPTIONS.map((opt) => (
            <Pressable
              key={opt.value}
              onPress={() => { setSlateVote(opt.value); setSlateError(false); }}
              style={[
                styles.radioRow,
                {
                  backgroundColor: slateVote === opt.value ? colors.primary + "12" : colors.muted,
                  borderColor: slateVote === opt.value ? colors.primary : colors.border,
                },
              ]}
            >
              <View
                style={[
                  styles.radioCircle,
                  {
                    borderColor: slateVote === opt.value ? colors.primary : colors.mutedForeground,
                    backgroundColor: slateVote === opt.value ? colors.primary : "transparent",
                  },
                ]}
              >
                {slateVote === opt.value && (
                  <View style={styles.radioDot} />
                )}
              </View>
              <Text style={[styles.radioLabel, { color: colors.foreground }]}>{opt.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* ── SECTION 2: Board Trustee Vote ── */}
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionBadge, { backgroundColor: "#f59e0b18" }]}>
            <Ionicons name="person-add-outline" size={18} color="#f59e0b" />
          </View>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Board Trustee Vote</Text>
        </View>
        <Text style={[styles.sectionDesc, { color: colors.mutedForeground }]}>
          Please select up to THREE candidates.
        </Text>

        {trusteeError && (
          <Text style={styles.errorText}>You may select a maximum of 3 candidates.</Text>
        )}

        <View style={styles.checkGroup}>
          {TRUSTEE_CANDIDATES.map((candidate) => {
            const selected = selectedTrustees.includes(candidate);
            return (
              <Pressable
                key={candidate}
                onPress={() => toggleTrustee(candidate)}
                style={[
                  styles.checkRow,
                  {
                    backgroundColor: selected ? colors.primary + "12" : colors.muted,
                    borderColor: selected ? colors.primary : colors.border,
                  },
                ]}
              >
                <View
                  style={[
                    styles.checkbox,
                    {
                      borderColor: selected ? colors.primary : colors.mutedForeground,
                      backgroundColor: selected ? colors.primary : "transparent",
                    },
                  ]}
                >
                  {selected && (
                    <Ionicons name="checkmark" size={12} color="#fff" />
                  )}
                </View>
                <Text style={[styles.checkLabel, { color: colors.foreground }]}>{candidate}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.selectionCount, { color: colors.mutedForeground }]}>
          {selectedTrustees.length} of 3 selected
        </Text>
      </View>

      {submitError ? (
        <Text style={[styles.errorText, { textAlign: "center" }]}>{submitError}</Text>
      ) : null}

      <Pressable
        onPress={handleSubmit}
        disabled={submitting}
        style={[
          styles.submitBtn,
          { backgroundColor: colors.primary, opacity: submitting ? 0.6 : 1 },
        ]}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <>
            <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
            <Text style={styles.submitBtnText}>Submit Vote</Text>
          </>
        )}
      </Pressable>

      <Text style={[styles.disclaimer, { color: colors.mutedForeground }]}>
        Each device may submit one ballot. Your vote is anonymous — results show totals only.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  statusCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 28,
    alignItems: "center",
    gap: 12,
    maxWidth: 360,
    width: "100%",
  },
  statusIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  statusTitle: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
  },
  statusDesc: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },
  container: {
    paddingHorizontal: 16,
    gap: 16,
  },
  header: {
    gap: 4,
    paddingTop: 4,
  },
  backPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 8,
  },
  backPillText: {
    fontSize: 13,
    fontWeight: "600",
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  pageSubtitle: {
    fontSize: 13,
  },
  section: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 0,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
  },
  sectionBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  sectionDesc: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 12,
  },
  slateList: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  slateRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  slateRole: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    flex: 1,
  },
  slateName: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "right",
    flex: 1.5,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 10,
  },
  errorText: {
    fontSize: 12,
    color: "#ef4444",
    fontWeight: "500",
    marginBottom: 8,
  },
  radioGroup: {
    gap: 8,
  },
  radioRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#fff",
  },
  radioLabel: {
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  checkGroup: {
    gap: 8,
  },
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  checkLabel: {
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  selectionCount: {
    fontSize: 12,
    marginTop: 10,
    textAlign: "right",
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
  },
  submitBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  disclaimer: {
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
    paddingBottom: 8,
  },
});
