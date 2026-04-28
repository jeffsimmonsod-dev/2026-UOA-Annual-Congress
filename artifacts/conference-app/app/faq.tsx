import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import React, { useState } from "react";
import {
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
import { FAQ } from "@/services/data";

function FaqItem({ item, colors }: { item: (typeof FAQ)[0]; colors: any }) {
  const [open, setOpen] = useState(false);
  const rotation = useSharedValue(0);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }), [rotation]);

  const toggleOpen = () => {
    const next = !open;
    setOpen(next);
    rotation.value = withTiming(next ? 180 : 0, { duration: 200 });
  };

  return (
    <View
      style={[
        styles.faqItem,
        { borderColor: colors.border, backgroundColor: colors.card },
      ]}
    >
      <Pressable
        onPress={toggleOpen}
        style={({ pressed }) => [
          styles.faqQuestion,
          pressed && { opacity: 0.75 },
        ]}
      >
        <Text
          style={[styles.questionText, { color: colors.foreground, flex: 1 }]}
        >
          {item.question}
        </Text>
        <Animated.View style={iconStyle}>
          <Ionicons
            name="chevron-down"
            size={18}
            color={colors.mutedForeground}
          />
        </Animated.View>
      </Pressable>
      {open && (
        <View
          style={[
            styles.faqAnswer,
            { borderTopColor: colors.border },
          ]}
        >
          <Text style={[styles.answerText, { color: colors.foreground }]}>
            {item.answer}
          </Text>
        </View>
      )}
    </View>
  );
}

export default function FaqScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { contentStyle } = useTabletLayout();
  const isWeb = Platform.OS === "web";

  const categories = Array.from(new Set(FAQ.map((f) => f.category)));

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.container,
        {
          paddingTop: isWeb ? insets.top + 16 : 16,
          paddingBottom: isWeb ? insets.bottom + 40 : 40,
        },
        contentStyle,
      ]}
      showsVerticalScrollIndicator={false}
    >
      {categories.map((category) => (
        <View key={category}>
          <Text
            style={[styles.categoryHeader, { color: colors.primary }]}
          >
            {category}
          </Text>
          {FAQ.filter((f) => f.category === category).map((item) => (
            <FaqItem key={item.id} item={item} colors={colors} />
          ))}
        </View>
      ))}

      <View
        style={[
          styles.contactCard,
          {
            backgroundColor: colors.primary + "10",
            borderColor: colors.primary + "30",
          },
        ]}
      >
        <Ionicons name="help-buoy-outline" size={28} color={colors.primary} />
        <Text style={[styles.contactTitle, { color: colors.foreground }]}>
          Still need help?
        </Text>
        <Text style={[styles.contactBody, { color: colors.mutedForeground }]}>
          Visit the info desk at Registration (Level 1) or reach us at{" "}
          <Text style={{ color: colors.primary }}>help@devsummit.io</Text>
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryHeader: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: 16,
    marginBottom: 8,
  },
  faqItem: {
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
    overflow: "hidden",
  },
  faqQuestion: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  questionText: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 22,
  },
  faqAnswer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    padding: 16,
    paddingTop: 14,
  },
  answerText: {
    fontSize: 14,
    lineHeight: 23,
  },
  contactCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    alignItems: "center",
    gap: 8,
    marginTop: 12,
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  contactBody: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
  },
});
