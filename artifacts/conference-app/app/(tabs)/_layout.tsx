import {
  createMaterialTopTabNavigator,
  type MaterialTopTabBarProps,
  type MaterialTopTabNavigationEventMap,
  type MaterialTopTabNavigationOptions,
} from "@react-navigation/material-top-tabs";
import { BlurView } from "expo-blur";
import { withLayoutContext } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Platform, Pressable, StyleSheet, Text, View, useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

/**
 * The main tabs are a swipeable pager (react-native-pager-view under the hood)
 * with the bottom bar drawn by BottomTabBar below, so the bar looks the same as
 * the old bottom-tabs bar: blurred on iOS, solid on Android/web, overlaying the
 * content. Tapping a tab still works exactly as before.
 *
 * Speakers, Venue and Para used to be hidden tabs. They are now regular stack
 * screens (app/speakers.tsx etc.) so a swipe can only ever land on one of the
 * five visible tabs. Their URLs (/speakers, /venue, /para) are unchanged.
 */
const { Navigator } = createMaterialTopTabNavigator();

type TabState = MaterialTopTabBarProps["state"];

const SwipeTabs = withLayoutContext<
  MaterialTopTabNavigationOptions,
  typeof Navigator,
  TabState,
  MaterialTopTabNavigationEventMap
>(Navigator);

type TabIcon = {
  sf: React.ComponentProps<typeof SymbolView>["name"];
  ionicon: keyof typeof Ionicons.glyphMap;
};

const TAB_ICONS: Record<string, TabIcon> = {
  index: { sf: "house", ionicon: "home-outline" },
  schedule: { sf: "calendar", ionicon: "calendar-outline" },
  "my-schedule": { sf: "bookmark", ionicon: "bookmark-outline" },
  photos: { sf: "photo.on.rectangle", ionicon: "images-outline" },
  more: { sf: "ellipsis", ionicon: "ellipsis-horizontal" },
};

/** Same height rule as @react-navigation/bottom-tabs, so screen bottom padding still fits. */
const BAR_CONTENT_HEIGHT = 49;
const WEB_BAR_HEIGHT = 84;

function BottomTabBar({ state, descriptors, navigation }: MaterialTopTabBarProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === "dark";
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";
  const height = isWeb ? WEB_BAR_HEIGHT : BAR_CONTENT_HEIGHT + insets.bottom;

  return (
    <View
      accessibilityRole="tablist"
      style={[
        styles.bar,
        {
          height,
          paddingBottom: isWeb ? 0 : insets.bottom,
          backgroundColor: isIOS ? "transparent" : colors.background,
          borderTopWidth: isWeb ? 1 : 0,
          borderTopColor: colors.border,
        },
      ]}
    >
      {isIOS ? (
        <BlurView intensity={100} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
      ) : null}
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key]!;
        const focused = state.index === index;
        const color = focused ? colors.primary : colors.mutedForeground;
        const label =
          typeof options.tabBarLabel === "string" ? options.tabBarLabel : options.title ?? route.name;
        const icon = TAB_ICONS[route.name];

        const onPress = () => {
          const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };
        const onLongPress = () => navigation.emit({ type: "tabLongPress", target: route.key });

        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
            testID={options.tabBarButtonTestID}
            onPress={onPress}
            onLongPress={onLongPress}
            style={styles.item}
          >
            {icon ? (
              isIOS ? (
                <SymbolView name={icon.sf} tintColor={color} size={24} />
              ) : (
                <Ionicons name={icon.ionicon} size={22} color={color} />
              )
            ) : null}
            <Text numberOfLines={1} style={[styles.label, { color }]}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabLayout() {
  const colors = useColors();
  return (
    <SwipeTabs
      tabBarPosition="bottom"
      tabBar={(props) => <BottomTabBar {...props} />}
      screenOptions={{
        swipeEnabled: true,
        animationEnabled: true,
        // Render a tab the first time it is needed, plus its direct neighbours
        // so a swipe never reveals a blank page. Already-visited tabs stay mounted.
        lazy: true,
        lazyPreloadDistance: 1,
        lazyPlaceholder: () => <View style={{ flex: 1, backgroundColor: colors.background }} />,
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <SwipeTabs.Screen name="index" options={{ title: "Home" }} />
      {/* Swiping on Schedule changes the day instead of the tab (see schedule.tsx). */}
      <SwipeTabs.Screen name="schedule" options={{ title: "Schedule", swipeEnabled: false }} />
      <SwipeTabs.Screen name="my-schedule" options={{ title: "My Schedule" }} />
      <SwipeTabs.Screen name="photos" options={{ title: "Community" }} />
      <SwipeTabs.Screen name="more" options={{ title: "More" }} />
    </SwipeTabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    overflow: "hidden",
  },
  item: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    paddingTop: 4,
  },
  label: {
    fontSize: 10,
    fontWeight: "500",
  },
});
