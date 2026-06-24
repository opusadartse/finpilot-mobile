import React, { useCallback } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Tabs } from "expo-router";
import { BottomTabBar, type BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/Colors";
import { useColorScheme } from "@/components/useColorScheme";

/** Selected tab — navy pill */
const NAVY_ACTIVE = "#0F172A";
const ACTIVE_TEXT = "#FFFFFF";
/** Unselected — same strong tone as active label (no gray “micro” text) */
const INACTIVE_ON_WHITE = "#0F172A";
const BAR_SURFACE = "#F8FAFC";
const TAB_BORDER = "#E2E8F0";

const TAB_MIN_WIDTH = 88;
const ICON_SIZE = 24;

const TAB_ITEM = {
  flexGrow: 0,
  flexShrink: 0,
  minWidth: TAB_MIN_WIDTH,
  maxWidth: 136,
  marginHorizontal: 5,
  borderRadius: 16,
  overflow: "hidden" as const,
  borderWidth: 1,
  borderColor: TAB_BORDER,
  backgroundColor: "transparent",
} as const;

function tabIcon(
  outline: React.ComponentProps<typeof Ionicons>["name"],
  solid: React.ComponentProps<typeof Ionicons>["name"],
  focused: boolean,
  color: string
) {
  return <Ionicons name={focused ? solid : outline} size={ICON_SIZE} color={color} />;
}

/**
 * Same font size/weight for every tab; only color changes with focus.
 * No adjustsFontSizeToFit — avoids inactive labels shrinking vs selected.
 */
function tabBarLabelFor(text: string) {
  return function TabBarLabel({ focused }: { focused: boolean }) {
    return (
      <Text
        numberOfLines={2}
        ellipsizeMode="clip"
        allowFontScaling
        style={[
          styles.tabLabel,
          {
            color: focused ? ACTIVE_TEXT : INACTIVE_ON_WHITE,
            fontWeight: focused ? "900" : "800",
          },
        ]}
      >
        {text}
      </Text>
    );
  };
}

type ScrollTabBarProps = BottomTabBarProps & {
  shellBorderColor: string;
};

function ScrollableTabBar({ shellBorderColor, ...props }: ScrollTabBarProps) {
  const insets = useSafeAreaInsets();
  /** Flush with safe area — use system inset only (no extra gray strip) */
  const bottomPad = Math.max(insets.bottom, 6);
  const minBarWidth = props.state.routes.length * TAB_MIN_WIDTH;
  const hPad = Math.max(insets.left, insets.right, 10);

  return (
    <View
      style={[
        styles.tabBarRoot,
        {
          borderTopColor: shellBorderColor,
          paddingBottom: bottomPad,
        },
      ]}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        bounces
        decelerationRate="fast"
        contentContainerStyle={[styles.scrollContent, { paddingLeft: hPad, paddingRight: hPad }]}
      >
        <BottomTabBar
          {...props}
          insets={{ top: 0, right: 0, bottom: 0, left: 0 }}
          style={[styles.innerBar, { minWidth: minBarWidth }]}
        />
      </ScrollView>
    </View>
  );
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const c = Colors[colorScheme ?? "dark"];

  const renderTabBar = useCallback(
    (props: BottomTabBarProps) => <ScrollableTabBar {...props} shellBorderColor={c.border} />,
    [c.border]
  );

  return (
    <Tabs
      initialRouteName="cards"
      tabBar={renderTabBar}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: ACTIVE_TEXT,
        tabBarInactiveTintColor: INACTIVE_ON_WHITE,
        tabBarActiveBackgroundColor: NAVY_ACTIVE,
        tabBarInactiveBackgroundColor: "#FFFFFF",
        tabBarShowLabel: true,
        tabBarLabelPosition: "below-icon",
        tabBarAllowFontScaling: true,
        tabBarIconStyle: { marginTop: 2 },
        tabBarItemStyle: TAB_ITEM,
        tabBarStyle: {
          backgroundColor: "transparent",
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
          height: undefined,
          minHeight: 78,
          margin: 0,
          padding: 0,
          position: "relative",
        },
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarLabel: tabBarLabelFor("Dashboard"),
          tabBarIcon: ({ color, focused }) => tabIcon("grid-outline", "grid", focused, color),
        }}
      />
      <Tabs.Screen
        name="cards"
        options={{
          title: "Credit Cards",
          tabBarLabel: tabBarLabelFor("Credit\nCards"),
          tabBarIcon: ({ color, focused }) => tabIcon("card-outline", "card", focused, color),
        }}
      />
      <Tabs.Screen
        name="planner"
        options={{
          title: "Plans",
          tabBarLabel: tabBarLabelFor("Plans"),
          tabBarIcon: ({ color, focused }) => tabIcon("calendar-outline", "calendar", focused, color),
        }}
      />
      <Tabs.Screen
        name="loans"
        options={{
          title: "Loans",
          tabBarLabel: tabBarLabelFor("Loans"),
          tabBarIcon: ({ color, focused }) => tabIcon("wallet-outline", "wallet", focused, color),
        }}
      />
      <Tabs.Screen
        name="payments"
        options={{
          title: "Payment History",
          tabBarLabel: tabBarLabelFor("Payment\nHistory"),
          tabBarIcon: ({ color, focused }) => tabIcon("cash-outline", "cash", focused, color),
        }}
      />
      <Tabs.Screen
        name="reminders"
        options={{
          title: "Reminders",
          tabBarLabel: tabBarLabelFor("Reminders"),
          tabBarIcon: ({ color, focused }) => tabIcon("notifications-outline", "notifications", focused, color),
        }}
      />
      <Tabs.Screen
        name="simulator"
        options={{
          title: "Simulator",
          tabBarLabel: tabBarLabelFor("Simulator"),
          tabBarIcon: ({ color, focused }) => tabIcon("speedometer-outline", "speedometer", focused, color),
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: "Insights",
          tabBarLabel: tabBarLabelFor("Insights"),
          tabBarIcon: ({ color, focused }) => tabIcon("stats-chart-outline", "stats-chart", focused, color),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarLabel: tabBarLabelFor("Settings"),
          tabBarIcon: ({ color, focused }) => tabIcon("settings-outline", "settings", focused, color),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  /** Edge-to-edge, square corners — no curved cutouts that anti-alias to black */
  tabBarRoot: {
    alignSelf: "stretch",
    width: "100%",
    backgroundColor: BAR_SURFACE,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginHorizontal: 0,
    shadowColor: "#0F172A",
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -2 },
    elevation: 6,
    overflow: "hidden",
  },
  scrollContent: {
    alignItems: "stretch",
    justifyContent: "center",
    alignSelf: "center",
    paddingTop: 6,
    paddingBottom: 0,
    minHeight: 82,
    flexGrow: 1,
  },
  innerBar: {
    backgroundColor: "transparent",
    borderTopWidth: 0,
    elevation: 0,
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    position: "relative",
    minHeight: 72,
    flexGrow: 1,
    alignSelf: "center",
  },
  tabLabel: {
    fontSize: 13,
    lineHeight: 16,
    textAlign: "center",
    marginTop: 3,
    width: "100%",
    paddingHorizontal: 3,
    letterSpacing: 0.1,
  },
});
