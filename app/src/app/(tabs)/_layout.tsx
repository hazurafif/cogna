import React from "react";
import { Tabs } from "expo-router";

export default function TabsLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="timer" options={{ title: "Timer" }} />
      <Tabs.Screen name="history" options={{ title: "History" }} />
      <Tabs.Screen name="subjects" options={{ title: "Subjects" }} />
    </Tabs>
  );
}
