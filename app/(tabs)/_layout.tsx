import React, { useCallback } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Tabs } from "expo-router";
import { BottomTabBar, type BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/Colors";
import { useColorScheme } from "@/components/useColorScheme";

/** Stronger active pill — maximum contrast */
const NAVY_ACTIVE = "#020617";
const ACTIVE_TEXT = "#FFFFFF";
const INACTIVE_TEXT = "#64748B";
const BAR_SURFACE = "#F8FAFC";

const TAB_MIN_WIDTH = 86;

const TAB_ITEM = {
  flexGrow: 0,
  flexShrink: 0,
  minWidth: TAB_MIN_WIDTH,
  maxWidth: 132,
  paddingVertical: 9,
  paddingHorizontal: 7,
  borderRadius: 14,
  marginHorizontal: 4,
} as const;

function tabIcon(
  outline: React.ComponentProps<typeof Ionicons>["name"],
  solid: React.ComponentProps<typeof Ionicons>["name"],
  focused: boolean,
  color: string
) {
  const size = focused ? 24 : 22;
  return <Ionicons name={focused ? solid : outline} size={size} color={color} />;
}

/** Readable two-line labels; `\n` for intentional breaks (e.g. Credit / Cards). */
function tabBarLabelFor(text: string) {
  return function TabBarLabel({ focused, color }: { focused: boolean; color: string }) {
    return (
      <Text
        numberOfLines={2}
        ellipsizeMode="clip"
        adjustsFontSizeToFit
        minimumFontScale={0.65}
        allowFontScaling
        style={[
          styles.tabLabel,
          {
            color,
            fontWeight: focused ? "900" : "800",
            opacity: focused ? 1 : 0.92,
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
  const bottomPad = Math.max(insets.bottom, 12);
  const minBarWidth = props.state.routes.length * TAB_MIN_WIDTH;
  const hPad = Math.max(insets.left, insets.right, 10);

  return (
    <View
      style={[
        styles.tabBarShell,
        {
          borderTopColor: shellBorderColor,
          paddingBottom: bottomPad,
          paddingHorizontal: hPad,
        },
      ]}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        bounces
        decelerationRate="fast"
        contentContainerStyle={styles.scrollContent}
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
        tabBarInactiveTintColor: INACTIVE_TEXT,
        tabBarActiveBackgroundColor: NAVY_ACTIVE,
        tabBarInactiveBackgroundColor: "transparent",
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
          minHeight: 88,
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
  tabBarShell: {
    alignSelf: "stretch",
    width: "100%",
    backgroundColor: BAR_SURFACE,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginHorizontal: 0,
    marginBottom: 0,
    shadowColor: "#0F172A",
    shadowOpacity: 0.07,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -2 },
    elevation: 6,
    overflow: "hidden",
  },
  scrollContent: {
    alignItems: "stretch",
    justifyContent: "center",
    alignSelf: "center",
    paddingTop: 10,
    paddingBottom: 2,
    paddingHorizontal: 6,
    minHeight: 94,
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
    minHeight: 88,
    flexGrow: 1,
    alignSelf: "center",
  },
  tabLabel: {
    fontSize: 12.5,
    lineHeight: 15,
    textAlign: "center",
    marginTop: 4,
    width: "100%",
    paddingHorizontal: 2,
  },
});
