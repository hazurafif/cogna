import React from "react";
import { Tabs } from "expo-router";
import { House, CircleDot, CircleUser } from "lucide-react-native";
import { colors } from "../../theme/colors";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 60,
          paddingTop: 6,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 10, fontWeight: "600" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: "Home", tabBarIcon: ({ color, size }) => <House size={size} strokeWidth={2.2} color={color} /> }}
      />
      <Tabs.Screen
        name="record"
        options={{ title: "Record", tabBarIcon: ({ color, size }) => <CircleDot size={size} strokeWidth={2.2} color={color} /> }}
      />
      <Tabs.Screen
        name="you"
        options={{ title: "You", tabBarIcon: ({ color, size }) => <CircleUser size={size} strokeWidth={2.2} color={color} /> }}
      />
    </Tabs>
  );
}
