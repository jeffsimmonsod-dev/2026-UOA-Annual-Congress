import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
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

const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;
const CORRECT_PIN = "Chanae2026!";

type Step = "pin" | "dashboard";
type AdminTab = "notifications" | "booths";
type SendMode = "now" | "schedule";

interface Booth {
  id: number;
  name: string;
  company: string;
  booth_number: string | null;
  description: string | null;
  secret_token: string;
  visit_count: number;
}

interface ScheduledAnnouncement {
  id: number;
  title: string;
  body: string;
  scheduled_for: string;
  sent_at: string | null;
}

function qrUrl(data: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(data)}`;
}

function boothQrData(booth: Booth) {
  return `uoa2026:booth:${booth.id}:${booth.secret_token}`;
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
  const [pinError, setPinError] = useState("");
  const [activeTab, setActiveTab] = useState<AdminTab>("notifications");

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const [sendMode, setSendMode] = useState<SendMode>("now");
  const [schedDate, setSchedDate] = useState("");
  const [schedTime, setSchedTime] = useState("");
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

  const handlePinSubmit = () => {
    if (pin === CORRECT_PIN) {
      setPinError("");
      setStep("dashboard");
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
    if (!schedDate || !schedTime) {
      Alert.alert("Missing date/time", "Please enter both a date and a time.");
      return;
    }

    const dt = new Date(`${schedDate}T${schedTime}:00`);
    if (isNaN(dt.getTime())) {
      Alert.alert("Invalid date/time", "Use YYYY-MM-DD for date and HH:MM for time (24-hour).");
      return;
    }
    if (dt <= new Date()) {
      Alert.alert("Invalid time", "Scheduled time must be in the future.");
      return;
    }

    setScheduling(true);
    try {
      const res = await fetch(`${API_BASE}/api/push/schedule`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-pin": CORRECT_PIN,
        },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim(),
          scheduledFor: dt.toISOString(),
        }),
      });

      if (res.ok) {
        Alert.alert("Scheduled!", `"${title.trim()}" will be sent on ${formatScheduledDate(dt.toISOString())}.`, [
          { text: "OK", onPress: () => { setTitle(""); setBody(""); setSchedDate(""); setSchedTime(""); setSendMode("now"); } },
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

  const fetchScheduled = useCallback(async () => {
    setScheduledLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/push/scheduled`, {
        headers: { "x-admin-pin": CORRECT_PIN },
      });
      if (res.ok) {
        const data = await res.json();
        setScheduledList(data.announcements);
      }
    } catch {}
    setScheduledLoading(false);
  }, []);

  const handleCancelScheduled = (item: ScheduledAnnouncement) => {
    Alert.alert("Cancel Announcement", `Remove "${item.title}" scheduled for ${formatScheduledDate(item.scheduled_for)}?`, [
      { text: "Keep", style: "cancel" },
      {
        text: "Cancel It",
        style: "destructive",
        onPress: async () => {
          await fetch(`${API_BASE}/api/push/scheduled/${item.id}`, {
            method: "DELETE",
            headers: { "x-admin-pin": CORRECT_PIN },
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
        headers: { "x-admin-pin": CORRECT_PIN },
      });
      if (res.ok) {
        const data = await res.json();
        setBooths(data.booths);
      }
    } catch {}
    setBoothsLoading(false);
  }, []);

  const fetchRaffle = useCallback(async () => {
    setRaffleLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/booths/admin/entries`, {
        headers: { "x-admin-pin": CORRECT_PIN },
      });
      if (res.ok) {
        const data = await res.json();
        setRaffleEntries(data.entries);
      }
    } catch {}
    setRaffleLoading(false);
  }, []);

  useEffect(() => {
    if (step === "dashboard" && activeTab === "notifications") {
      fetchScheduled();
    }
    if (step === "dashboard" && activeTab === "booths") {
      fetchBooths();
      fetchRaffle();
    }
  }, [step, activeTab, fetchBooths, fetchRaffle, fetchScheduled]);

  const handleAddBooth = async () => {
    if (!newBoothName.trim() || !newBoothCompany.trim()) {
      Alert.alert("Required", "Please enter a booth name and company.");
      return;
    }
    setAddingBooth(true);
    try {
      const res = await fetch(`${API_BASE}/api/booths`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-pin": CORRECT_PIN },
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
            headers: { "x-admin-pin": CORRECT_PIN },
          });
          fetchBooths();
          fetchRaffle();
        },
      },
    ]);
  };

  const handlePrintQR = (booth: Booth) => {
    const data = boothQrData(booth);
    const url = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(data)}&margin=20`;
    Linking.openURL(url);
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
            <Pressable onPress={handlePinSubmit} style={[styles.button, { backgroundColor: colors.primary }]}>
              <Text style={styles.buttonText}>Continue</Text>
              <Ionicons name="arrow-forward" size={16} color="#fff" />
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
          { key: "notifications", label: "Notifications", icon: "megaphone-outline" },
          { key: "booths", label: "Exhibit Hall", icon: "storefront-outline" },
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
                  <Text style={[styles.scheduleFormTitle, { color: colors.foreground }]}>
                    <Ionicons name="calendar-outline" size={14} color={colors.foreground} /> When to send
                  </Text>
                  <View style={styles.scheduleRow}>
                    <View style={{ flex: 1.4 }}>
                      <Text style={[styles.scheduleFieldLabel, { color: colors.mutedForeground }]}>Date (YYYY-MM-DD)</Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]}
                        placeholder="2026-06-05"
                        placeholderTextColor={colors.mutedForeground}
                        value={schedDate}
                        onChangeText={setSchedDate}
                        keyboardType="numbers-and-punctuation"
                        maxLength={10}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.scheduleFieldLabel, { color: colors.mutedForeground }]}>Time (HH:MM)</Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]}
                        placeholder="09:30"
                        placeholderTextColor={colors.mutedForeground}
                        value={schedTime}
                        onChangeText={setSchedTime}
                        keyboardType="numbers-and-punctuation"
                        maxLength={5}
                      />
                    </View>
                  </View>
                  <Text style={[styles.scheduleHint, { color: colors.mutedForeground }]}>
                    Time is in your local timezone · 24-hour format (e.g. 14:30 = 2:30 PM)
                  </Text>
                </View>
              )}

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
                    <View key={entry.device_id} style={[styles.raffleEntry, { borderTopColor: colors.border }]}>
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
                  return (
                    <View key={booth.id} style={[styles.boothItem, { borderColor: colors.border }]}>
                      <Pressable onPress={() => setExpandedBoothId(isExpanded ? null : booth.id)} style={styles.boothItemHeader}>
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
                          <Image
                            source={{ uri: qrUrl(boothQrData(booth)) }}
                            style={styles.qrImage}
                            resizeMode="contain"
                          />
                          <Text style={[styles.qrLabel, { color: colors.mutedForeground }]}>
                            Scan this QR code at the booth
                          </Text>
                          <View style={styles.boothActions}>
                            <Pressable onPress={() => handlePrintQR(booth)} style={[styles.actionBtn, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "40" }]}>
                              <Ionicons name="open-outline" size={16} color={colors.primary} />
                              <Text style={[styles.actionBtnText, { color: colors.primary }]}>Open Full-Size QR</Text>
                            </Pressable>
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
  scheduleHint: { fontSize: 11, lineHeight: 16 },
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
  boothActions: { flexDirection: "row", gap: 8, flexWrap: "wrap", justifyContent: "center" },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  actionBtnText: { fontSize: 13, fontWeight: "600" },
});
