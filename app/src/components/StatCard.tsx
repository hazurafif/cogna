import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme/colors";
import { fontSize, radius, spacing } from "../theme/tokens";

type StatCardProps = {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  label: string;
  highlighted?: boolean;
};

export function StatCard({ icon, value, label, highlighted }: StatCardProps) {
  const tint = highlighted ? colors.white : colors.primary;
  return (
    <View testID="stat-card" style={[styles.card, highlighted && styles.highlighted]}>
      <Ionicons name={icon} size={14} color={tint} />
      <Text style={[styles.value, highlighted && styles.valueHighlighted]}>{value}</Text>
      <Text style={[styles.label, highlighted && styles.labelHighlighted]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: "center",
    gap: spacing.xs,
  },
  highlighted: { backgroundColor: colors.primary },
  value: {
    fontSize: fontSize.title,
    fontWeight: "700",
    color: colors.text,
    fontVariant: ["tabular-nums"],
  },
  valueHighlighted: { color: colors.white },
  label: { fontSize: fontSize.label, color: colors.textSecondary },
  labelHighlighted: { color: colors.white, opacity: 0.85 },
});
