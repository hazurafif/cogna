import React from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ColorValue } from "react-native";
import { colors } from "../../theme/colors";

type IoniconName = keyof typeof Ionicons.glyphMap;

function tabIcon(name: IoniconName) {
  return function TabBarIcon({ color, size }: { color: ColorValue; size: number }) {
    return <Ionicons name={name} size={size} color={color} />;
  };
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.bg,
          borderTopColor: colors.border,
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 10, fontWeight: "600" },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: tabIcon("home-outline") }} />
      <Tabs.Screen name="timer" options={{ title: "Timer", tabBarIcon: tabIcon("stopwatch-outline") }} />
      <Tabs.Screen name="history" options={{ title: "History", tabBarIcon: tabIcon("time-outline") }} />
      <Tabs.Screen name="subjects" options={{ title: "Subjects", tabBarIcon: tabIcon("pricetag-outline") }} />
    </Tabs>
  );
}
