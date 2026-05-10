import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from "@expo/vector-icons";

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const c = Colors[colorScheme ?? "dark"];

  return (
    <Tabs
      initialRouteName="cards"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.tint,
        tabBarInactiveTintColor: c.tabIconDefault,
        tabBarStyle: {
          backgroundColor: "#F8FAFC",
          borderTopColor: c.border,
          borderTopWidth: 1,
          height: 78,
          paddingTop: 9,
          paddingBottom: 11,
          paddingHorizontal: 10,
          marginHorizontal: 14,
          marginBottom: 10,
          borderRadius: 20,
          shadowColor: "#0F172A",
          shadowOpacity: 0.06,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 3 },
          elevation: 3,
          position: "absolute",
        },
        tabBarLabelStyle: { fontWeight: "700", fontSize: 11, marginTop: 3 },
        tabBarItemStyle: { borderRadius: 12, marginHorizontal: 2 },
        tabBarHideOnKeyboard: true,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => <Ionicons name="grid-outline" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="cards"
        options={{
          title: 'Cards',
          tabBarIcon: ({ color }) => <Ionicons name="card-outline" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="planner"
        options={{
          title: "Planner",
          tabBarIcon: ({ color }) => <Ionicons name="calculator-outline" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="loans"
        options={{
          title: "Loans",
          tabBarIcon: ({ color }) => <Ionicons name="wallet-outline" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="payments"
        options={{
          title: "Payments",
          tabBarIcon: ({ color }) => <Ionicons name="cash-outline" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="reminders"
        options={{
          title: "Reminders",
          tabBarIcon: ({ color }) => <Ionicons name="notifications-outline" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="simulator"
        options={{
          title: "Simulator",
          tabBarIcon: ({ color }) => <Ionicons name="speedometer-outline" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: "Analytics",
          tabBarIcon: ({ color }) => <Ionicons name="stats-chart-outline" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color }) => <Ionicons name="settings-outline" size={22} color={color} />,
        }}
      />
    </Tabs>
  );
}
