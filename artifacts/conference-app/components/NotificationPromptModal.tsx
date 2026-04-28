import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useProfile } from "@/context/ProfileContext";
import { registerForPushNotificationsAsync } from "@/services/pushNotifications";

const STORAGE_KEY = "@uoa_notif_prompt_shown";

export default function NotificationPromptModal() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile, profileLoaded } = useProfile();
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!profileLoaded || !profile) return;
    AsyncStorage.getItem(STORAGE_KEY).then((val) => {
      if (!val) setVisible(true);
    });
  }, [profileLoaded, profile]);

  const markShown = () => AsyncStorage.setItem(STORAGE_KEY, "1");

  const handleEnable = async () => {
    setLoading(true);
    await registerForPushNotificationsAsync();
    setLoading(false);
    await markShown();
    setVisible(false);
  };

  const handleDismiss = async () => {
    await markShown();
    setVisible(false);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleDismiss}
    >
      <Pressable style={styles.backdrop} onPress={handleDismiss}>
        <Pressable
          style={[
            styles.sheet,
            {
              backgroundColor: colors.card,
              paddingBottom: insets.bottom + 20,
            },
          ]}
          onPress={() => {}}
        >
          {/* Green icon header */}
          <View style={styles.iconWrap}>
            <View style={styles.iconCircle}>
              <Ionicons name="notifications" size={34} color="#16a34a" />
            </View>
          </View>

          <Text style={[styles.title, { color: colors.foreground }]}>
            Stay in the know
          </Text>
          <Text style={[styles.body, { color: colors.mutedForeground }]}>
            Enable notifications to get real-time alerts for sponsored lunches, prize giveaways, raffle drawings, and important schedule updates during the congress.
          </Text>

          <View style={styles.bullets}>
            {[
              "Sponsored lunch & dinner reminders",
              "Raffle drawing alerts",
              "Last-minute schedule changes",
              "Prize giveaway announcements",
            ].map((item) => (
              <View key={item} style={styles.bulletRow}>
                <View style={styles.bulletDot} />
                <Text style={[styles.bulletText, { color: colors.mutedForeground }]}>
                  {item}
                </Text>
              </View>
            ))}
          </View>

          <Pressable
            onPress={handleEnable}
            disabled={loading}
            style={({ pressed }) => [
              styles.enableBtn,
              { opacity: pressed || loading ? 0.85 : 1 },
            ]}
          >
            <Ionicons name="notifications-outline" size={18} color="#fff" />
            <Text style={styles.enableBtnText}>
              {loading ? "Setting up…" : "Enable Notifications"}
            </Text>
          </Pressable>

          <Pressable onPress={handleDismiss} style={styles.dismissBtn}>
            <Text style={[styles.dismissText, { color: colors.mutedForeground }]}>
              Not now
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 28,
    alignItems: "center",
    gap: 12,
  },
  iconWrap: {
    marginBottom: 4,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#dcfce7",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: -0.4,
  },
  body: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
  bullets: {
    width: "100%",
    gap: 8,
    marginTop: 4,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  bulletDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#16a34a",
    flexShrink: 0,
  },
  bulletText: {
    fontSize: 13,
    flex: 1,
  },
  enableBtn: {
    marginTop: 8,
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#16a34a",
    paddingVertical: 15,
    borderRadius: 14,
  },
  enableBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  dismissBtn: {
    paddingVertical: 8,
  },
  dismissText: {
    fontSize: 14,
  },
});
