import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { sendPushNotification } from "@/services/pushNotifications";

const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

type Step = "pin" | "dashboard";
type AdminTab = "notifications" | "booths" | "analytics" | "photos" | "voting";
type SendMode = "now" | "schedule";

interface BoothVisitor {
  attendee_name: string | null;
  attendee_email: string | null;
  visited_at: string;
  attendee_id: number;
}

interface BoothAnalytics {
  id: number;
  company: string;
  booth_number: string | null;
  visit_count: number;
  visitors: BoothVisitor[];
}

interface AnalyticsData {
  booths: BoothAnalytics[];
  totalVisits: number;
  uniqueAttendees: number;
}

interface Booth {
  id: number;
  name: string;
  company: string;
  booth_number: string | null;
  description: string | null;
  visit_count: number;
}

interface ScheduledAnnouncement {
  id: number;
  title: string;
  body: string;
  scheduled_for: string;
  sent_at: string | null;
}

function formatScheduledDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit",
  });
}

export default function AdminScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";

  const [step, setStep] = useState<Step>("pin");
  const [pin, setPin] = useState("");
  const [verifiedPin, setVerifiedPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [pinVerifying, setPinVerifying] = useState(false);
  const [activeTab, setActiveTab] = useState<AdminTab>("notifications");

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const [sendMode, setSendMode] = useState<SendMode>("now");
  const [schedDateTime, setSchedDateTime] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [scheduledList, setScheduledList] = useState<ScheduledAnnouncement[]>([]);
  const [scheduledLoading, setScheduledLoading] = useState(false);

  const [booths, setBooths] = useState<Booth[]>([]);
  const [boothsLoading, setBoothsLoading] = useState(false);
  const [raffleEntries, setRaffleEntries] = useState<any[]>([]);
  const [raffleLoading, setRaffleLoading] = useState(false);
  const [showAddBooth, setShowAddBooth] = useState(false);
  const [newBoothName, setNewBoothName] = useState("");
  const [newBoothCompany, setNewBoothCompany] = useState("");
  const [newBoothNumber, setNewBoothNumber] = useState("");
  const [addingBooth, setAddingBooth] = useState(false);
  const [expandedBoothId, setExpandedBoothId] = useState<number | null>(null);
  const [liveQrState, setLiveQrState] = useState<Record<number, { dataUrl: string | null; loading: boolean }>>({});

  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [expandedAnalyticsId, setExpandedAnalyticsId] = useState<number | null>(null);

  const [adminPhotos, setAdminPhotos] = useState<{ id: string; objectPath: string; uploaderName: string; caption: string; likes: number; createdAt: string }[]>([]);
  const [photosLoading, setPhotosLoading] = useState(false);
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null);

  interface VotingResults {
    isOpen: boolean;
    totalVotes: number;
    slateResults: { approve: number; disapprove: number; abstain: number };
    trusteeResults: Record<string, number>;
  }
  const [votingResults, setVotingResults] = useState<VotingResults | null>(null);
  const [votingLoading, setVotingLoading] = useState(false);
  const [votingAction, setVotingAction] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handlePinSubmit = async () => {
    if (!pin.trim()) return;
    setPinVerifying(true);
    setPinError("");
    try {
      const res = await fetch(`${API_BASE}/api/admin/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.valid) {
          setVerifiedPin(pin);
          setPin("");
          setStep("dashboard");
        } else {
          setPinError("Incorrect PIN. Try again.");
          setPin("");
        }
      } else if (res.status === 401) {
        setPinError("Incorrect PIN. Try again.");
        setPin("");
      } else {
        setPinError("Could not verify PIN. Please try again.");
      }
    } catch {
      setPinError("Could not reach the server. Check your connection.");
    }
    setPinVerifying(false);
  };

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) {
      Alert.alert("Missing fields", "Please enter both a title and a message.");
      return;
    }
    setSending(true);
    const result = await sendPushNotification(title.trim(), body.trim(), verifiedPin);
    setSending(false);
    if (result.success) {
      Alert.alert("Sent!", result.message, [{ text: "OK", onPress: () => { setTitle(""); setBody(""); } }]);
    } else {
      Alert.alert("Error", result.message);
    }
  };

  const handleSchedule = async () => {
    if (!title.trim() || !body.trim()) {
      Alert.alert("Missing fields", "Please enter both a title and a message.");
      return;
    }
    if (!schedDateTime) {
      Alert.alert("Missing date/time", "Please pick a date and time.");
      return;
    }
    if (schedDateTime <= new Date()) {
      Alert.alert("Invalid time", "Scheduled time must be in the future.");
      return;
    }

    setScheduling(true);
    try {
      const res = await fetch(`${API_BASE}/api/push/schedule`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-pin": verifiedPin,
        },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim(),
          scheduledFor: schedDateTime.toISOString(),
        }),
      });

      if (res.ok) {
        Alert.alert("Scheduled!", `"${title.trim()}" will be sent on ${formatScheduledDate(schedDateTime.toISOString())}.`, [
          { text: "OK", onPress: () => { setTitle(""); setBody(""); setSchedDateTime(null); setSendMode("now"); } },
        ]);
        fetchScheduled();
      } else {
        const err = await res.json();
        Alert.alert("Error", err.error || "Could not schedule announcement.");
      }
    } catch {
      Alert.alert("Error", "Could not reach the server.");
    }
    setScheduling(false);
  };

  const onDateChange = (_: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === "android") setShowDatePicker(false);
    if (selected) {
      setSchedDateTime((prev) => {
        const base = prev ?? new Date();
        const next = new Date(base);
        next.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
        return next;
      });
    }
  };

  const onTimeChange = (_: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === "android") setShowTimePicker(false);
    if (selected) {
      setSchedDateTime((prev) => {
        const base = prev ?? new Date();
        const next = new Date(base);
        next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
        return next;
      });
    }
  };

  const formattedDate = schedDateTime
    ? schedDateTime.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
    : null;

  const formattedTime = schedDateTime
    ? schedDateTime.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
    : null;

  const fetchScheduled = useCallback(async () => {
    setScheduledLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/push/scheduled`, {
        headers: { "x-admin-pin": verifiedPin },
      });
      if (res.ok) {
        const data = await res.json();
        setScheduledList(data.announcements);
      }
    } catch {}
    setScheduledLoading(false);
  }, [verifiedPin]);

  const handleCancelScheduled = (item: ScheduledAnnouncement) => {
    Alert.alert("Cancel Announcement", `Remove "${item.title}" scheduled for ${formatScheduledDate(item.scheduled_for)}?`, [
      { text: "Keep", style: "cancel" },
      {
        text: "Cancel It",
        style: "destructive",
        onPress: async () => {
          await fetch(`${API_BASE}/api/push/scheduled/${item.id}`, {
            method: "DELETE",
            headers: { "x-admin-pin": verifiedPin },
          });
          fetchScheduled();
        },
      },
    ]);
  };

  const fetchBooths = useCallback(async () => {
    setBoothsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/booths/admin`, {
        headers: { "x-admin-pin": verifiedPin },
      });
      if (res.ok) {
        const data = await res.json();
        setBooths(data.booths);
      }
    } catch {}
    setBoothsLoading(false);
  }, [verifiedPin]);

  const fetchRaffle = useCallback(async () => {
    setRaffleLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/booths/admin/entries`, {
        headers: { "x-admin-pin": verifiedPin },
      });
      if (res.ok) {
        const data = await res.json();
        setRaffleEntries(data.entries);
      }
    } catch {}
    setRaffleLoading(false);
  }, [verifiedPin]);

  const fetchAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/booths/admin/analytics`, {
        headers: { "x-admin-pin": verifiedPin },
      });
      if (res.ok) {
        setAnalyticsData(await res.json());
      }
    } catch {}
    setAnalyticsLoading(false);
  }, [verifiedPin]);

  const fetchAdminPhotos = useCallback(async () => {
    setPhotosLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/photos/admin`, {
        headers: { "x-admin-pin": verifiedPin },
      });
      if (res.ok) {
        const data = await res.json();
        setAdminPhotos(data.photos);
      }
    } catch {}
    setPhotosLoading(false);
  }, [verifiedPin]);

  const fetchVotingResults = useCallback(async () => {
    setVotingLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/voting/results`, {
        headers: { "x-admin-pin": verifiedPin },
      });
      if (res.ok) {
        setVotingResults(await res.json());
      }
    } catch {}
    setVotingLoading(false);
  }, [verifiedPin]);

  const handleVotingControl = async (action: "open" | "close" | "reset") => {
    if (action === "reset") {
      setShowResetConfirm(true);
      return;
    }
    setVotingAction(action);
    await fetch(`${API_BASE}/api/voting/${action}`, {
      method: "POST",
      headers: { "x-admin-pin": verifiedPin },
    });
    setVotingAction(null);
    fetchVotingResults();
  };

  const handleVotingReset = async () => {
    setShowResetConfirm(false);
    setVotingAction("reset");
    await fetch(`${API_BASE}/api/voting/reset`, {
      method: "POST",
      headers: { "x-admin-pin": verifiedPin },
    });
    setVotingAction(null);
    fetchVotingResults();
  };

  const handleAdminDeletePhoto = (photoId: string, uploaderName: string) => {
    Alert.alert(
      "Remove Photo",
      `Remove this photo by ${uploaderName}? It will be deleted for everyone immediately.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            setDeletingPhotoId(photoId);
            try {
              const res = await fetch(`${API_BASE}/api/photos/${photoId}`, {
                method: "DELETE",
                headers: { "x-admin-pin": verifiedPin },
              });
              if (res.ok) {
                setAdminPhotos((prev) => prev.filter((p) => p.id !== photoId));
              } else {
                Alert.alert("Error", "Could not delete the photo.");
              }
            } catch {
              Alert.alert("Error", "Could not reach the server.");
            }
            setDeletingPhotoId(null);
          },
        },
      ]
    );
  };

  const handleExportCSV = async () => {
    if (!analyticsData) return;
    const lines: string[] = ["Company,Booth #,Attendee Name,Attendee Email,Visit Time"];
    for (const booth of analyticsData.booths) {
      if (booth.visitors.length === 0) {
        lines.push(`"${booth.company}","${booth.booth_number ?? ""}","(no visits)","",""`);
      } else {
        for (const v of booth.visitors) {
          const name = v.attendee_name || "(no name)";
          const email = v.attendee_email || "";
          const time = new Date(v.visited_at).toLocaleString(undefined, {
            month: "short", day: "numeric", year: "numeric",
            hour: "numeric", minute: "2-digit",
          });
          lines.push(`"${booth.company}","${booth.booth_number ?? ""}","${name}","${email}","${time}"`);
        }
      }
    }
    const csv = lines.join("\n");
    try {
      await Share.share({
        title: "UOA Congress 2026 – Sponsor Visit Report",
        message: csv,
      });
    } catch {}
  };

  useEffect(() => {
    if (step === "dashboard" && activeTab === "notifications") {
      fetchScheduled();
    }
    if (step === "dashboard" && activeTab === "booths") {
      fetchBooths();
      fetchRaffle();
    }
    if (step === "dashboard" && activeTab === "analytics") {
      fetchAnalytics();
    }
    if (step === "dashboard" && activeTab === "photos") {
      fetchAdminPhotos();
    }
    if (step === "dashboard" && activeTab === "voting") {
      fetchVotingResults();
    }
  }, [step, activeTab, fetchBooths, fetchRaffle, fetchScheduled, fetchAnalytics, fetchAdminPhotos, fetchVotingResults]);

  const handleAddBooth = async () => {
    if (!newBoothName.trim() || !newBoothCompany.trim()) {
      Alert.alert("Required", "Please enter a booth name and company.");
      return;
    }
    setAddingBooth(true);
    try {
      const res = await fetch(`${API_BASE}/api/booths`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-pin": verifiedPin },
        body: JSON.stringify({ name: newBoothName.trim(), company: newBoothCompany.trim(), boothNumber: newBoothNumber.trim() }),
      });
      if (res.ok) {
        setNewBoothName("");
        setNewBoothCompany("");
        setNewBoothNumber("");
        setShowAddBooth(false);
        fetchBooths();
      }
    } catch {
      Alert.alert("Error", "Could not add booth.");
    }
    setAddingBooth(false);
  };

  const handleDeleteBooth = (booth: Booth) => {
    Alert.alert("Delete Booth", `Remove "${booth.company}"? This also deletes all visit records.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await fetch(`${API_BASE}/api/booths/${booth.id}`, {
            method: "DELETE",
            headers: { "x-admin-pin": verifiedPin },
          });
          fetchBooths();
          fetchRaffle();
        },
      },
    ]);
  };

  const fetchStaticQr = useCallback(async (boothId: number) => {
    if (liveQrState[boothId]?.dataUrl) return;
    setLiveQrState((prev) => ({ ...prev, [boothId]: { dataUrl: null, loading: true } }));
    try {
      const qrRes = await fetch(`${API_BASE}/api/booths/admin/${boothId}/qr`, {
        headers: { "x-admin-pin": verifiedPin },
      });
      if (!qrRes.ok) {
        setLiveQrState((prev) => ({ ...prev, [boothId]: { dataUrl: null, loading: false } }));
        return;
      }
      const { dataUrl } = await qrRes.json();
      setLiveQrState((prev) => ({ ...prev, [boothId]: { dataUrl, loading: false } }));
    } catch {
      setLiveQrState((prev) => ({ ...prev, [boothId]: { dataUrl: null, loading: false } }));
    }
  }, [verifiedPin, liveQrState]);

  useEffect(() => {
    if (expandedBoothId === null) return;
    fetchStaticQr(expandedBoothId);
  }, [expandedBoothId, fetchStaticQr]);

  const handlePrintQR = (_booth: Booth) => {
    Linking.openURL(`${API_BASE}/admin/qr-codes`);
  };

  const pending = scheduledList.filter((a) => !a.sent_at);
  const sent = scheduledList.filter((a) => a.sent_at);

  if (step === "pin") {
    return (
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={[styles.container, { paddingTop: isWeb ? insets.top + 24 : 24, paddingBottom: 60 }]} keyboardShouldPersistTaps="handled">
          <View style={[styles.sectionHeader, { backgroundColor: colors.primary + "12", borderColor: colors.primary + "25" }]}>
            <Ionicons name="shield-checkmark-outline" size={24} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Admin Panel</Text>
              <Text style={[styles.sectionSub, { color: colors.mutedForeground }]}>UOA Staff Only</Text>
            </View>
          </View>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.label, { color: colors.foreground }]}>Admin PIN</Text>
            <Text style={[styles.hint, { color: colors.mutedForeground }]}>Enter the UOA admin PIN to access this feature.</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderColor: pinError ? "#ef4444" : colors.border }]}
              placeholder="Enter PIN"
              placeholderTextColor={colors.mutedForeground}
              value={pin}
              onChangeText={setPin}
              secureTextEntry
              returnKeyType="go"
              onSubmitEditing={handlePinSubmit}
              autoFocus
            />
            {pinError ? <Text style={styles.errorText}>{pinError}</Text> : null}
            <Pressable
              onPress={handlePinSubmit}
              disabled={pinVerifying}
              style={[styles.button, { backgroundColor: colors.primary, opacity: pinVerifying ? 0.6 : 1 }]}
            >
              {pinVerifying
                ? <ActivityIndicator color="#fff" size="small" />
                : <>
                    <Text style={styles.buttonText}>Continue</Text>
                    <Ionicons name="arrow-forward" size={16} color="#fff" />
                  </>
              }
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <View style={[styles.tabBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {([
          { key: "notifications", label: "Alerts", icon: "megaphone-outline" },
          { key: "booths", label: "Booths", icon: "storefront-outline" },
          { key: "analytics", label: "Analytics", icon: "bar-chart-outline" },
          { key: "photos", label: "Photos", icon: "images-outline" },
          { key: "voting", label: "Voting", icon: "checkbox-outline" },
        ] as const).map((tab) => (
          <Pressable
            key={tab.key}
            onPress={() => setActiveTab(tab.key)}
            style={[styles.tabItem, activeTab === tab.key && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
          >
            <Ionicons name={tab.icon} size={18} color={activeTab === tab.key ? colors.primary : colors.mutedForeground} />
            <Text style={[styles.tabLabel, { color: activeTab === tab.key ? colors.primary : colors.mutedForeground }]}>{tab.label}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: 16, paddingBottom: isWeb ? insets.bottom + 60 : 60 }]}
        keyboardShouldPersistTaps="handled"
      >
        {activeTab === "notifications" && (
          <>
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.label, { color: colors.foreground }]}>Announcement Title</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
                placeholder="e.g., Lunch is now being served"
                placeholderTextColor={colors.mutedForeground}
                value={title}
                onChangeText={setTitle}
                returnKeyType="next"
                maxLength={80}
              />
              <Text style={[styles.label, { color: colors.foreground, marginTop: 4 }]}>Message</Text>
              <TextInput
                style={[styles.textArea, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
                placeholder="Detailed message for attendees..."
                placeholderTextColor={colors.mutedForeground}
                value={body}
                onChangeText={setBody}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                maxLength={300}
              />
              <Text style={[styles.charCount, { color: colors.mutedForeground }]}>{body.length}/300</Text>

              <View style={styles.quickFills}>
                <Text style={[styles.quickFillLabel, { color: colors.mutedForeground }]}>Quick fill:</Text>
                {[
                  { t: "Lunch Now Served", b: "Lunch is now being served in the Grand Ballroom. Please make your way to the dining area." },
                  { t: "Session Starting Soon", b: "The next CE session begins in 5 minutes. Please make your way to your assigned room." },
                  { t: "Exhibitor Hall Open", b: "The exhibitor hall is now open! Visit our sponsors and partners in the main exhibit area." },
                ].map((q) => (
                  <Pressable key={q.t} onPress={() => { setTitle(q.t); setBody(q.b); }} style={[styles.quickFillChip, { backgroundColor: colors.accent, borderColor: colors.border }]}>
                    <Text style={[styles.quickFillText, { color: colors.primary }]}>{q.t}</Text>
                  </Pressable>
                ))}
              </View>

              <View style={[styles.sendModeRow, { borderColor: colors.border }]}>
                <Pressable
                  onPress={() => setSendMode("now")}
                  style={[styles.sendModeBtn, sendMode === "now" && { backgroundColor: colors.primary }, { borderColor: sendMode === "now" ? colors.primary : colors.border }]}
                >
                  <Ionicons name="send-outline" size={14} color={sendMode === "now" ? "#fff" : colors.mutedForeground} />
                  <Text style={[styles.sendModeBtnText, { color: sendMode === "now" ? "#fff" : colors.mutedForeground }]}>Send Now</Text>
                </Pressable>
                <Pressable
                  onPress={() => setSendMode("schedule")}
                  style={[styles.sendModeBtn, sendMode === "schedule" && { backgroundColor: colors.primary }, { borderColor: sendMode === "schedule" ? colors.primary : colors.border }]}
                >
                  <Ionicons name="time-outline" size={14} color={sendMode === "schedule" ? "#fff" : colors.mutedForeground} />
                  <Text style={[styles.sendModeBtnText, { color: sendMode === "schedule" ? "#fff" : colors.mutedForeground }]}>Schedule</Text>
                </Pressable>
              </View>

              {sendMode === "schedule" && (
                <View style={[styles.scheduleForm, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                  <Text style={[styles.scheduleFormTitle, { color: colors.foreground }]}>When to send</Text>
                  <View style={styles.scheduleRow}>
                    <Pressable
                      onPress={() => setShowDatePicker(true)}
                      style={[styles.pickerBtn, { backgroundColor: colors.background, borderColor: formattedDate ? colors.primary : colors.border }]}
                    >
                      <Ionicons name="calendar-outline" size={16} color={formattedDate ? colors.primary : colors.mutedForeground} />
                      <Text style={[styles.pickerBtnText, { color: formattedDate ? colors.foreground : colors.mutedForeground }]}>
                        {formattedDate ?? "Pick date"}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setShowTimePicker(true)}
                      style={[styles.pickerBtn, { backgroundColor: colors.background, borderColor: formattedTime ? colors.primary : colors.border }]}
                    >
                      <Ionicons name="time-outline" size={16} color={formattedTime ? colors.primary : colors.mutedForeground} />
                      <Text style={[styles.pickerBtnText, { color: formattedTime ? colors.foreground : colors.mutedForeground }]}>
                        {formattedTime ?? "Pick time"}
                      </Text>
                    </Pressable>
                  </View>
                  {schedDateTime && (
                    <Text style={[styles.scheduleHint, { color: colors.primary }]}>
                      Sends on {formatScheduledDate(schedDateTime.toISOString())}
                    </Text>
                  )}
                </View>
              )}

              {/* Android pickers render as native dialogs when visible */}
              {Platform.OS === "android" && showDatePicker && (
                <DateTimePicker
                  value={schedDateTime ?? new Date()}
                  mode="date"
                  display="calendar"
                  minimumDate={new Date()}
                  onChange={onDateChange}
                />
              )}
              {Platform.OS === "android" && showTimePicker && (
                <DateTimePicker
                  value={schedDateTime ?? new Date()}
                  mode="time"
                  display="clock"
                  onChange={onTimeChange}
                />
              )}

              {/* iOS/web: modal with inline calendar or spinner */}
              <Modal visible={showDatePicker && Platform.OS !== "android"} transparent animationType="slide" onRequestClose={() => setShowDatePicker(false)}>
                <Pressable style={styles.pickerBackdrop} onPress={() => setShowDatePicker(false)}>
                  <Pressable style={[styles.pickerSheet, { backgroundColor: colors.card }]} onPress={() => {}}>
                    <View style={styles.pickerSheetHandle} />
                    <Text style={[styles.pickerSheetTitle, { color: colors.foreground }]}>Select Date</Text>
                    <DateTimePicker
                      value={schedDateTime ?? new Date()}
                      mode="date"
                      display={Platform.OS === "ios" ? "inline" : "default"}
                      minimumDate={new Date()}
                      onChange={onDateChange}
                      style={{ width: "100%" }}
                      accentColor={colors.primary}
                    />
                    <Pressable onPress={() => setShowDatePicker(false)} style={[styles.pickerDoneBtn, { backgroundColor: colors.primary }]}>
                      <Text style={styles.pickerDoneBtnText}>Done</Text>
                    </Pressable>
                  </Pressable>
                </Pressable>
              </Modal>

              <Modal visible={showTimePicker && Platform.OS !== "android"} transparent animationType="slide" onRequestClose={() => setShowTimePicker(false)}>
                <Pressable style={styles.pickerBackdrop} onPress={() => setShowTimePicker(false)}>
                  <Pressable style={[styles.pickerSheet, { backgroundColor: colors.card }]} onPress={() => {}}>
                    <View style={styles.pickerSheetHandle} />
                    <Text style={[styles.pickerSheetTitle, { color: colors.foreground }]}>Select Time</Text>
                    <DateTimePicker
                      value={schedDateTime ?? new Date()}
                      mode="time"
                      display={Platform.OS === "ios" ? "spinner" : "default"}
                      onChange={onTimeChange}
                      style={{ width: "100%" }}
                      accentColor={colors.primary}
                    />
                    <Pressable onPress={() => setShowTimePicker(false)} style={[styles.pickerDoneBtn, { backgroundColor: colors.primary }]}>
                      <Text style={styles.pickerDoneBtnText}>Done</Text>
                    </Pressable>
                  </Pressable>
                </Pressable>
              </Modal>

              {sendMode === "now" ? (
                <Pressable onPress={handleSend} disabled={sending} style={[styles.button, { backgroundColor: sending ? colors.muted : colors.primary }]}>
                  <Ionicons name="send-outline" size={16} color={sending ? colors.mutedForeground : "#fff"} />
                  <Text style={[styles.buttonText, { color: sending ? colors.mutedForeground : "#fff" }]}>
                    {sending ? "Sending..." : "Send to All Attendees"}
                  </Text>
                </Pressable>
              ) : (
                <Pressable onPress={handleSchedule} disabled={scheduling} style={[styles.button, { backgroundColor: scheduling ? colors.muted : colors.primary }]}>
                  <Ionicons name="time-outline" size={16} color={scheduling ? colors.mutedForeground : "#fff"} />
                  <Text style={[styles.buttonText, { color: scheduling ? colors.mutedForeground : "#fff" }]}>
                    {scheduling ? "Scheduling..." : "Schedule Announcement"}
                  </Text>
                </Pressable>
              )}

              <Pressable onPress={() => { setStep("pin"); setPin(""); }}>
                <Text style={[styles.backLink, { color: colors.mutedForeground }]}>← Lock admin panel</Text>
              </Pressable>
            </View>

            {/* Scheduled announcements list */}
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.scheduledHeader}>
                <Ionicons name="calendar-outline" size={18} color={colors.primary} />
                <Text style={[styles.label, { color: colors.foreground, flex: 1 }]}>Scheduled Announcements</Text>
                <Pressable onPress={fetchScheduled} style={styles.refreshBtn}>
                  <Ionicons name="refresh" size={16} color={colors.primary} />
                </Pressable>
              </View>

              {scheduledLoading ? (
                <ActivityIndicator color={colors.primary} style={{ marginVertical: 12 }} />
              ) : pending.length === 0 && sent.length === 0 ? (
                <Text style={[styles.hint, { color: colors.mutedForeground, textAlign: "center", paddingVertical: 8 }]}>
                  No scheduled announcements yet.
                </Text>
              ) : (
                <>
                  {pending.length > 0 && (
                    <>
                      <Text style={[styles.scheduledSectionLabel, { color: colors.mutedForeground }]}>UPCOMING</Text>
                      {pending.map((item) => (
                        <View key={item.id} style={[styles.scheduledItem, { borderColor: colors.border, backgroundColor: colors.primary + "08" }]}>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.scheduledItemTitle, { color: colors.foreground }]}>{item.title}</Text>
                            <Text style={[styles.scheduledItemBody, { color: colors.mutedForeground }]} numberOfLines={1}>{item.body}</Text>
                            <View style={styles.scheduledItemTimeRow}>
                              <Ionicons name="time-outline" size={12} color={colors.primary} />
                              <Text style={[styles.scheduledItemTime, { color: colors.primary }]}>
                                {formatScheduledDate(item.scheduled_for)}
                              </Text>
                            </View>
                          </View>
                          <Pressable onPress={() => handleCancelScheduled(item)} style={styles.cancelBtn}>
                            <Ionicons name="close-circle-outline" size={22} color="#ef4444" />
                          </Pressable>
                        </View>
                      ))}
                    </>
                  )}

                  {sent.length > 0 && (
                    <>
                      <Text style={[styles.scheduledSectionLabel, { color: colors.mutedForeground, marginTop: pending.length > 0 ? 12 : 0 }]}>SENT</Text>
                      {sent.map((item) => (
                        <View key={item.id} style={[styles.scheduledItem, { borderColor: colors.border, opacity: 0.6 }]}>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.scheduledItemTitle, { color: colors.foreground }]}>{item.title}</Text>
                            <View style={styles.scheduledItemTimeRow}>
                              <Ionicons name="checkmark-circle-outline" size={12} color="#10b981" />
                              <Text style={[styles.scheduledItemTime, { color: "#10b981" }]}>
                                Sent {formatScheduledDate(item.sent_at!)}
                              </Text>
                            </View>
                          </View>
                        </View>
                      ))}
                    </>
                  )}
                </>
              )}
            </View>
          </>
        )}

        {activeTab === "booths" && (
          <>
            <View style={[styles.raffleCard, { backgroundColor: "#10b98112", borderColor: "#10b98140" }]}>
              <View style={styles.raffleRow}>
                <Ionicons name="trophy-outline" size={22} color="#10b981" />
                <Text style={[styles.raffleTitle, { color: colors.foreground }]}>Raffle Entries</Text>
                <Pressable onPress={fetchRaffle} style={styles.refreshBtn}>
                  <Ionicons name="refresh" size={16} color={colors.primary} />
                </Pressable>
              </View>
              {raffleLoading ? (
                <ActivityIndicator color="#10b981" />
              ) : raffleEntries.length === 0 ? (
                <Text style={[styles.raffleEmpty, { color: colors.mutedForeground }]}>No completed passports yet</Text>
              ) : (
                <>
                  <Text style={[styles.raffleCount, { color: "#10b981" }]}>{raffleEntries.length} completed passport{raffleEntries.length !== 1 ? "s" : ""}</Text>
                  {raffleEntries.map((entry, i) => (
                    <View key={String(entry.attendee_id)} style={[styles.raffleEntry, { borderTopColor: colors.border }]}>
                      <Text style={[styles.raffleEntryName, { color: colors.foreground }]}>
                        {i + 1}. {entry.attendee_name || "(no name)"}
                      </Text>
                      <Text style={[styles.raffleEntryTime, { color: colors.mutedForeground }]}>
                        Completed {new Date(entry.last_visit).toLocaleDateString()}
                      </Text>
                    </View>
                  ))}
                </>
              )}
            </View>

            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.boothsHeader}>
                <Text style={[styles.label, { color: colors.foreground }]}>Booths ({booths.length})</Text>
                <View style={styles.headerActions}>
                  <Pressable onPress={fetchBooths} style={styles.refreshBtn}>
                    <Ionicons name="refresh" size={16} color={colors.primary} />
                  </Pressable>
                  <Pressable onPress={() => setShowAddBooth(!showAddBooth)} style={[styles.addBtn, { backgroundColor: colors.primary }]}>
                    <Ionicons name={showAddBooth ? "close" : "add"} size={16} color="#fff" />
                    <Text style={styles.addBtnText}>{showAddBooth ? "Cancel" : "Add Booth"}</Text>
                  </Pressable>
                </View>
              </View>

              {showAddBooth && (
                <View style={[styles.addBoothForm, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                  <Text style={[styles.addBoothTitle, { color: colors.foreground }]}>New Booth</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]}
                    placeholder="Company / Exhibitor name *"
                    placeholderTextColor={colors.mutedForeground}
                    value={newBoothCompany}
                    onChangeText={setNewBoothCompany}
                  />
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]}
                    placeholder="Booth display name *"
                    placeholderTextColor={colors.mutedForeground}
                    value={newBoothName}
                    onChangeText={setNewBoothName}
                  />
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]}
                    placeholder="Booth # (optional)"
                    placeholderTextColor={colors.mutedForeground}
                    value={newBoothNumber}
                    onChangeText={setNewBoothNumber}
                    keyboardType="numeric"
                  />
                  <Pressable onPress={handleAddBooth} disabled={addingBooth} style={[styles.button, { backgroundColor: colors.primary }]}>
                    {addingBooth ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.buttonText}>Create Booth & Generate QR</Text>}
                  </Pressable>
                </View>
              )}

              {boothsLoading ? (
                <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />
              ) : booths.length === 0 ? (
                <Text style={[styles.hint, { color: colors.mutedForeground, textAlign: "center", paddingVertical: 16 }]}>
                  No booths yet. Add booths above, then print the QR code for each.
                </Text>
              ) : (
                booths.map((booth) => {
                  const isExpanded = expandedBoothId === booth.id;
                  const qr = liveQrState[booth.id];
                  return (
                    <View key={booth.id} style={[styles.boothItem, { borderColor: colors.border }]}>
                      <Pressable
                        onPress={() => {
                          setExpandedBoothId(isExpanded ? null : booth.id);
                        }}
                        style={styles.boothItemHeader}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.boothItemName, { color: colors.foreground }]}>
                            {booth.booth_number ? `#${booth.booth_number} · ` : ""}{booth.company}
                          </Text>
                          <Text style={[styles.boothItemSub, { color: colors.mutedForeground }]}>
                            {booth.name} · {booth.visit_count} visit{booth.visit_count !== 1 ? "s" : ""}
                          </Text>
                        </View>
                        <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={18} color={colors.mutedForeground} />
                      </Pressable>

                      {isExpanded && (
                        <View style={[styles.boothExpanded, { borderTopColor: colors.border }]}>
                          <View style={[styles.liveQrBadge, { backgroundColor: "#4f46e518", borderColor: "#4f46e540" }]}>
                            <Ionicons name="qr-code-outline" size={13} color={colors.primary} />
                            <Text style={[styles.liveQrBadgeText, { color: colors.primary }]}>Static QR — print and place at booth for attendees to scan</Text>
                          </View>
                          {qr?.loading || !qr ? (
                            <ActivityIndicator color={colors.primary} style={styles.qrImage} />
                          ) : qr.dataUrl ? (
                            <Image source={{ uri: qr.dataUrl }} style={styles.qrImage} resizeMode="contain" />
                          ) : (
                            <Text style={[styles.hint, { color: "#ef4444", marginVertical: 16 }]}>Failed to load QR code</Text>
                          )}
                          <View style={styles.boothActions}>
                            <Pressable onPress={() => handleDeleteBooth(booth)} style={[styles.actionBtn, { backgroundColor: "#ef444415", borderColor: "#ef444440" }]}>
                              <Ionicons name="trash-outline" size={16} color="#ef4444" />
                              <Text style={[styles.actionBtnText, { color: "#ef4444" }]}>Delete</Text>
                            </Pressable>
                          </View>
                        </View>
                      )}
                    </View>
                  );
                })
              )}
            </View>

            <Pressable onPress={() => { setStep("pin"); setPin(""); }}>
              <Text style={[styles.backLink, { color: colors.mutedForeground }]}>← Lock admin panel</Text>
            </Pressable>
          </>
        )}

        {activeTab === "analytics" && (
          <>
            {analyticsLoading ? (
              <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
            ) : !analyticsData ? (
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.hint, { color: colors.mutedForeground, textAlign: "center" }]}>
                  Could not load analytics.
                </Text>
              </View>
            ) : (
              <>
                {/* Summary stats */}
                <View style={styles.analyticsStatsRow}>
                  <View style={[styles.analyticsStatCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.analyticsStatNum, { color: colors.primary }]}>{analyticsData.totalVisits}</Text>
                    <Text style={[styles.analyticsStatLabel, { color: colors.mutedForeground }]}>Total Scans</Text>
                  </View>
                  <View style={[styles.analyticsStatCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.analyticsStatNum, { color: colors.primary }]}>{analyticsData.uniqueAttendees}</Text>
                    <Text style={[styles.analyticsStatLabel, { color: colors.mutedForeground }]}>Unique Attendees</Text>
                  </View>
                  <View style={[styles.analyticsStatCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.analyticsStatNum, { color: colors.primary }]}>
                      {analyticsData.booths.filter((b) => Number(b.visit_count) > 0).length}
                    </Text>
                    <Text style={[styles.analyticsStatLabel, { color: colors.mutedForeground }]}>Active Booths</Text>
                  </View>
                </View>

                {/* Export button */}
                <Pressable
                  onPress={handleExportCSV}
                  style={({ pressed }) => [
                    styles.exportBtn,
                    { backgroundColor: "#10b981", opacity: pressed ? 0.85 : 1 },
                  ]}
                >
                  <Ionicons name="download-outline" size={18} color="#fff" />
                  <Text style={styles.exportBtnText}>Export Full Report as CSV</Text>
                </Pressable>

                {/* Per-booth breakdown */}
                <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={styles.scheduledHeader}>
                    <Ionicons name="bar-chart-outline" size={18} color={colors.primary} />
                    <Text style={[styles.label, { color: colors.foreground, flex: 1 }]}>Booth Visitor Breakdown</Text>
                    <Pressable onPress={fetchAnalytics} style={styles.refreshBtn}>
                      <Ionicons name="refresh" size={16} color={colors.primary} />
                    </Pressable>
                  </View>
                  <Text style={[styles.hint, { color: colors.mutedForeground, marginTop: -4 }]}>
                    Sorted by most visited · Tap a booth to see attendees
                  </Text>

                  {analyticsData.booths.map((booth) => {
                    const isExpanded = expandedAnalyticsId === booth.id;
                    const count = Number(booth.visit_count);
                    return (
                      <View key={booth.id} style={[styles.boothItem, { borderColor: colors.border, marginTop: 8 }]}>
                        <Pressable
                          onPress={() => setExpandedAnalyticsId(isExpanded ? null : booth.id)}
                          style={styles.boothItemHeader}
                        >
                          <View style={[
                            styles.visitCountBadge,
                            { backgroundColor: count > 0 ? colors.primary + "18" : colors.muted },
                          ]}>
                            <Text style={[styles.visitCountNum, { color: count > 0 ? colors.primary : colors.mutedForeground }]}>
                              {count}
                            </Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.boothItemName, { color: colors.foreground }]}>
                              {booth.booth_number ? `#${booth.booth_number} · ` : ""}{booth.company}
                            </Text>
                            <Text style={[styles.boothItemSub, { color: colors.mutedForeground }]}>
                              {count === 0 ? "No scans yet" : `${count} scan${count !== 1 ? "s" : ""}`}
                            </Text>
                          </View>
                          <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={18} color={colors.mutedForeground} />
                        </Pressable>

                        {isExpanded && (
                          <View style={[styles.boothExpanded, { borderTopColor: colors.border, alignItems: "stretch" }]}>
                            {booth.visitors.length === 0 ? (
                              <Text style={[styles.hint, { color: colors.mutedForeground }]}>No scans recorded yet.</Text>
                            ) : (
                              booth.visitors.map((v, i) => (
                                <View
                                  key={i}
                                  style={[
                                    styles.visitorRow,
                                    i < booth.visitors.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
                                  ]}
                                >
                                  <Ionicons name="person-outline" size={14} color={colors.primary} />
                                  <View style={{ flex: 1 }}>
                                    <Text style={[styles.visitorName, { color: colors.foreground }]}>
                                      {v.attendee_name || "(no name)"}
                                    </Text>
                                    {v.attendee_email ? (
                                      <Text style={[styles.visitorTime, { color: colors.primary }]}>
                                        {v.attendee_email}
                                      </Text>
                                    ) : null}
                                    <Text style={[styles.visitorTime, { color: colors.mutedForeground }]}>
                                      {new Date(v.visited_at).toLocaleString(undefined, {
                                        month: "short", day: "numeric",
                                        hour: "numeric", minute: "2-digit",
                                      })}
                                    </Text>
                                  </View>
                                </View>
                              ))
                            )}
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              </>
            )}

            <Pressable onPress={() => { setStep("pin"); setPin(""); }}>
              <Text style={[styles.backLink, { color: colors.mutedForeground }]}>← Lock admin panel</Text>
            </Pressable>
          </>
        )}

        {activeTab === "voting" && (
          <>
            {votingLoading && !votingResults ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: 32 }} />
            ) : (
              <>
                {/* Status + Controls */}
                <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={styles.boothsHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.label, { color: colors.foreground }]}>Voting Status</Text>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
                        <View style={{
                          width: 8, height: 8, borderRadius: 4,
                          backgroundColor: votingResults?.isOpen ? "#10b981" : "#ef4444",
                        }} />
                        <Text style={[styles.hint, { color: votingResults?.isOpen ? "#10b981" : "#ef4444", fontWeight: "700" }]}>
                          {votingResults?.isOpen ? "Voting is OPEN" : "Voting is CLOSED"}
                        </Text>
                      </View>
                    </View>
                    <Pressable
                      onPress={fetchVotingResults}
                      disabled={votingLoading}
                      style={[styles.refreshBtn, { opacity: votingLoading ? 0.4 : 1 }]}
                    >
                      {votingLoading
                        ? <ActivityIndicator size="small" color={colors.primary} />
                        : <Ionicons name="refresh" size={16} color={colors.primary} />
                      }
                    </Pressable>
                  </View>

                  {showResetConfirm ? (
                    <View style={[{ borderRadius: 10, borderWidth: 1.5, borderColor: "#ef4444", padding: 12, gap: 10, backgroundColor: "#ef444410" }]}>
                      <Text style={[styles.hint, { color: colors.foreground, fontWeight: "700" }]}>
                        Delete all {votingResults?.totalVotes ?? 0} ballot{votingResults?.totalVotes !== 1 ? "s" : ""}? This cannot be undone.
                      </Text>
                      <View style={{ flexDirection: "row", gap: 8 }}>
                        <Pressable
                          onPress={() => setShowResetConfirm(false)}
                          style={[styles.actionBtn, { flex: 1, borderColor: colors.border }]}
                        >
                          <Text style={[styles.actionBtnText, { color: colors.foreground }]}>Cancel</Text>
                        </Pressable>
                        <Pressable
                          onPress={handleVotingReset}
                          disabled={votingAction === "reset"}
                          style={[styles.actionBtn, { flex: 1, backgroundColor: "#ef4444", borderColor: "#ef4444" }]}
                        >
                          {votingAction === "reset"
                            ? <ActivityIndicator color="#fff" size="small" />
                            : <Text style={[styles.actionBtnText, { color: "#fff" }]}>Yes, Reset</Text>
                          }
                        </Pressable>
                      </View>
                    </View>
                  ) : (
                    <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
                      <Pressable
                        onPress={() => handleVotingControl("open")}
                        disabled={votingAction !== null || votingResults?.isOpen}
                        style={[styles.actionBtn, {
                          flex: 1,
                          backgroundColor: "#10b981",
                          borderColor: "#10b981",
                          opacity: votingResults?.isOpen ? 0.4 : 1,
                        }]}
                      >
                        {votingAction === "open"
                          ? <ActivityIndicator color="#fff" size="small" />
                          : <Text style={[styles.actionBtnText, { color: "#fff" }]}>Open Voting</Text>
                        }
                      </Pressable>
                      <Pressable
                        onPress={() => handleVotingControl("close")}
                        disabled={votingAction !== null || !votingResults?.isOpen}
                        style={[styles.actionBtn, {
                          flex: 1,
                          backgroundColor: colors.muted,
                          borderColor: colors.border,
                          opacity: !votingResults?.isOpen ? 0.4 : 1,
                        }]}
                      >
                        {votingAction === "close"
                          ? <ActivityIndicator color={colors.foreground} size="small" />
                          : <Text style={[styles.actionBtnText, { color: colors.foreground }]}>Close Voting</Text>
                        }
                      </Pressable>
                      <Pressable
                        onPress={() => handleVotingControl("reset")}
                        disabled={votingAction !== null}
                        style={[styles.actionBtn, { borderColor: "#ef4444" }]}
                      >
                        {votingAction === "reset"
                          ? <ActivityIndicator color="#ef4444" size="small" />
                          : <Text style={[styles.actionBtnText, { color: "#ef4444" }]}>Reset</Text>
                        }
                      </Pressable>
                    </View>
                  )}

                  <View style={[styles.analyticsStatsRow, { marginTop: 4 }]}>
                    <View style={[styles.analyticsStatCard, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                      <Text style={[styles.analyticsStatNum, { color: colors.primary }]}>
                        {votingResults?.totalVotes ?? 0}
                      </Text>
                      <Text style={[styles.analyticsStatLabel, { color: colors.mutedForeground }]}>
                        Total Ballots
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Officer Slate Results */}
                <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.label, { color: colors.foreground }]}>Officer Slate Results</Text>
                  {([
                    { key: "approve", label: "Approve officer slate", color: "#10b981" },
                    { key: "disapprove", label: "Do not approve officer slate", color: "#ef4444" },
                    { key: "abstain", label: "Abstain", color: "#94a3b8" },
                  ] as const).map((opt) => {
                    const count = votingResults?.slateResults?.[opt.key] ?? 0;
                    const total = votingResults?.totalVotes ?? 0;
                    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                    return (
                      <View key={opt.key} style={{ gap: 4 }}>
                        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                          <Text style={[styles.hint, { color: colors.foreground, fontWeight: "600" }]}>{opt.label}</Text>
                          <Text style={[styles.hint, { color: colors.mutedForeground }]}>{count} ({pct}%)</Text>
                        </View>
                        <View style={{ height: 6, backgroundColor: colors.muted, borderRadius: 3, overflow: "hidden" }}>
                          <View style={{ height: 6, width: `${pct}%`, backgroundColor: opt.color, borderRadius: 3 }} />
                        </View>
                      </View>
                    );
                  })}
                </View>

                {/* Trustee Results */}
                <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.label, { color: colors.foreground }]}>Board Trustee Results</Text>
                  <Text style={[styles.hint, { color: colors.mutedForeground }]}>
                    Each ballot may include up to 3 trustee selections.
                  </Text>
                  {votingResults && Object.entries(votingResults.trusteeResults)
                    .sort(([, a], [, b]) => b - a)
                    .map(([candidate, count], idx) => {
                      const totalBallots = votingResults.totalVotes;
                      const pct = totalBallots > 0 ? Math.round((count / totalBallots) * 100) : 0;
                      return (
                        <View key={candidate} style={{ gap: 4 }}>
                          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                              <View style={{
                                width: 22, height: 22, borderRadius: 11,
                                backgroundColor: colors.primary + "18",
                                alignItems: "center", justifyContent: "center",
                              }}>
                                <Text style={{ fontSize: 11, fontWeight: "700", color: colors.primary }}>{idx + 1}</Text>
                              </View>
                              <Text style={[styles.hint, { color: colors.foreground, fontWeight: "600" }]}>{candidate}</Text>
                            </View>
                            <Text style={[styles.hint, { color: colors.mutedForeground }]}>{count} votes ({pct}%)</Text>
                          </View>
                          <View style={{ height: 6, backgroundColor: colors.muted, borderRadius: 3, overflow: "hidden" }}>
                            <View style={{ height: 6, width: `${pct}%`, backgroundColor: colors.primary, borderRadius: 3 }} />
                          </View>
                        </View>
                      );
                    })
                  }
                </View>
              </>
            )}

            <Pressable onPress={() => { setStep("pin"); setPin(""); }}>
              <Text style={[styles.backLink, { color: colors.mutedForeground }]}>← Lock admin panel</Text>
            </Pressable>
          </>
        )}

        {activeTab === "photos" && (
          <>
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.boothsHeader}>
                <View>
                  <Text style={[styles.label, { color: colors.foreground }]}>Photo Moderation</Text>
                  <Text style={[styles.hint, { color: colors.mutedForeground }]}>
                    {adminPhotos.length} photo{adminPhotos.length !== 1 ? "s" : ""} uploaded
                  </Text>
                </View>
                <Pressable onPress={fetchAdminPhotos} style={styles.refreshBtn}>
                  <Ionicons name="refresh" size={16} color={colors.primary} />
                </Pressable>
              </View>

              {photosLoading ? (
                <ActivityIndicator color={colors.primary} style={{ marginVertical: 24 }} />
              ) : adminPhotos.length === 0 ? (
                <Text style={[styles.hint, { color: colors.mutedForeground, textAlign: "center", paddingVertical: 24 }]}>
                  No photos have been uploaded yet.
                </Text>
              ) : (
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                  {adminPhotos.map((photo) => {
                    const uri = `${API_BASE}/api/storage/objects${photo.objectPath}`;
                    const isDeleting = deletingPhotoId === photo.id;
                    return (
                      <View key={photo.id} style={{ width: "47%", position: "relative" }}>
                        <Image
                          source={{ uri }}
                          style={{ width: "100%", aspectRatio: 1, borderRadius: 8, backgroundColor: colors.muted }}
                          resizeMode="cover"
                        />
                        {photo.caption ? (
                          <Text style={{ color: colors.mutedForeground, fontSize: 11, marginTop: 2 }} numberOfLines={1}>
                            {photo.caption}
                          </Text>
                        ) : null}
                        <Text style={{ color: colors.mutedForeground, fontSize: 10 }} numberOfLines={1}>
                          {photo.uploaderName}
                        </Text>
                        <Pressable
                          onPress={() => handleAdminDeletePhoto(photo.id, photo.uploaderName)}
                          disabled={isDeleting}
                          style={{
                            position: "absolute", top: 4, right: 4,
                            backgroundColor: "rgba(0,0,0,0.65)", borderRadius: 14,
                            padding: 5,
                          }}
                        >
                          {isDeleting
                            ? <ActivityIndicator size="small" color="#fff" />
                            : <Ionicons name="trash-outline" size={16} color="#ff4444" />
                          }
                        </Pressable>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>

            <Pressable onPress={() => { setStep("pin"); setPin(""); }}>
              <Text style={[styles.backLink, { color: colors.mutedForeground }]}>← Lock admin panel</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, gap: 16 },
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tabItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabLabel: { fontSize: 13, fontWeight: "600" },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  sectionTitle: { fontSize: 16, fontWeight: "700" },
  sectionSub: { fontSize: 12, marginTop: 2 },
  card: { borderRadius: 16, borderWidth: 1, padding: 20, gap: 12 },
  label: { fontSize: 14, fontWeight: "600" },
  hint: { fontSize: 13, lineHeight: 20 },
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
  charCount: { fontSize: 11, textAlign: "right", marginTop: -8 },
  errorText: { color: "#ef4444", fontSize: 13 },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 4,
  },
  buttonText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  quickFills: { gap: 8 },
  quickFillLabel: { fontSize: 12, fontWeight: "600" },
  quickFillChip: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  quickFillText: { fontSize: 13, fontWeight: "500" },
  backLink: { fontSize: 13, textAlign: "center", marginTop: 4 },
  sendModeRow: {
    flexDirection: "row",
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
    marginTop: -4,
  },
  sendModeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  sendModeBtnText: { fontSize: 13, fontWeight: "700" },
  scheduleForm: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 10,
    marginTop: -4,
  },
  scheduleFormTitle: { fontSize: 13, fontWeight: "700", marginBottom: 2 },
  scheduleRow: { flexDirection: "row", gap: 10 },
  scheduleFieldLabel: { fontSize: 11, fontWeight: "600", marginBottom: 4 },
  scheduleHint: { fontSize: 12, lineHeight: 16 },
  pickerBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    paddingVertical: 13,
  },
  pickerBtnText: { fontSize: 14, fontWeight: "500", flex: 1 },
  pickerBackdrop: {
    flex: 1,
    backgroundColor: "#00000055",
    justifyContent: "flex-end",
  },
  pickerSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 36,
    gap: 12,
    alignItems: "center",
  },
  pickerSheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#cbd5e1",
    marginBottom: 4,
  },
  pickerSheetTitle: { fontSize: 16, fontWeight: "700", alignSelf: "flex-start" },
  pickerDoneBtn: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 4,
  },
  pickerDoneBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  scheduledHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  scheduledSectionLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.5, marginBottom: 4 },
  scheduledItem: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    gap: 10,
    marginTop: 6,
  },
  scheduledItemTitle: { fontSize: 14, fontWeight: "600" },
  scheduledItemBody: { fontSize: 12, marginTop: 2 },
  scheduledItemTimeRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  scheduledItemTime: { fontSize: 12, fontWeight: "500" },
  cancelBtn: { padding: 4 },
  refreshBtn: { padding: 4 },
  raffleCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    gap: 8,
  },
  raffleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  raffleTitle: { flex: 1, fontSize: 15, fontWeight: "700" },
  raffleEmpty: { fontSize: 13 },
  raffleCount: { fontSize: 16, fontWeight: "700" },
  raffleEntry: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 8, marginTop: 4 },
  raffleEntryName: { fontSize: 14, fontWeight: "600" },
  raffleEntryTime: { fontSize: 12, marginTop: 2 },
  boothsHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  addBtnText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  addBoothForm: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 10 },
  addBoothTitle: { fontSize: 14, fontWeight: "700" },
  boothItem: { borderRadius: 12, borderWidth: 1, overflow: "hidden", marginTop: 8 },
  boothItemHeader: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  boothItemName: { fontSize: 14, fontWeight: "600" },
  boothItemSub: { fontSize: 12, marginTop: 2 },
  boothExpanded: { borderTopWidth: StyleSheet.hairlineWidth, padding: 14, alignItems: "center", gap: 10 },
  qrImage: { width: 160, height: 160, borderRadius: 8 },
  qrLabel: { fontSize: 12 },
  liveQrBadge: { flexDirection: "row", alignItems: "center", gap: 5, borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  liveQrBadgeText: { fontSize: 11, fontWeight: "600" },
  boothActions: { flexDirection: "row", gap: 8, flexWrap: "wrap", justifyContent: "center" },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  actionBtnText: { fontSize: 13, fontWeight: "600" },
  analyticsStatsRow: { flexDirection: "row", gap: 10 },
  analyticsStatCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    alignItems: "center",
    gap: 4,
  },
  analyticsStatNum: { fontSize: 26, fontWeight: "800" },
  analyticsStatLabel: { fontSize: 11, fontWeight: "600", textAlign: "center" },
  exportBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  exportBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  visitCountBadge: {
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  visitCountNum: { fontSize: 18, fontWeight: "800" },
  visitorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
  },
  visitorName: { fontSize: 14, fontWeight: "600" },
  visitorTime: { fontSize: 11, marginTop: 1 },
});
