import React from "react";
import { Tabs } from "expo-router";
import { House, CircleDot, Users, CircleUser } from "lucide-react-native";
import { Icon } from "../../components/ui/icon";

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Icon name={House} size={size} strokeWidth={2.2} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="record"
        options={{
          title: "Record",
          tabBarIcon: ({ color, size }) => (
            <Icon name={CircleDot} size={size} strokeWidth={2.2} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="feed"
        options={{
          title: "Feed",
          tabBarIcon: ({ color, size }) => (
            <Icon name={Users} size={size} strokeWidth={2.2} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="you"
        options={{
          title: "You",
          tabBarIcon: ({ color, size }) => (
            <Icon name={CircleUser} size={size} strokeWidth={2.2} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
