import React from "react";
import { Tabs } from "expo-router";
import { House, Timer, ClockArrowUp, Tags } from "lucide-react-native";
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
        name="timer"
        options={{ title: "Timer", tabBarIcon: ({ color, size }) => <Timer size={size} strokeWidth={2.2} color={color} /> }}
      />
      <Tabs.Screen
        name="history"
        options={{ title: "History", tabBarIcon: ({ color, size }) => <ClockArrowUp size={size} strokeWidth={2.2} color={color} /> }}
      />
      <Tabs.Screen
        name="subjects"
        options={{ title: "Subjects", tabBarIcon: ({ color, size }) => <Tags size={size} strokeWidth={2.2} color={color} /> }}
      />
    </Tabs>
  );
}
