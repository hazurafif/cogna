import React from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { LucideIcon } from "lucide-react-native";
import { colors } from "../theme/colors";
import { appFonts } from "../theme/fonts";
import { fontSize, radius, shadow, spacing } from "../theme/tokens";

type StatCardProps = {
  icon: LucideIcon;
  value: string;
  label: string;
  highlighted?: boolean;
};

export function StatCard({ icon: Icon, value, label, highlighted }: StatCardProps) {
  const tint = highlighted ? colors.white : colors.primary;
  return (
    <View
      testID="stat-card"
      style={[styles.card, highlighted && styles.highlighted]}
    >
      <View style={[styles.iconBadge, highlighted && styles.iconBadgeHighlighted]}>
        <Icon size={14} strokeWidth={2.5} color={tint} />
      </View>
      <Text style={[styles.value, highlighted && styles.valueHighlighted]}>{value}</Text>
      <Text style={[styles.label, highlighted && styles.labelHighlighted]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    paddingTop: spacing.lg,
    alignItems: "center",
    gap: spacing.xs,
    ...shadow.card,
  },
  highlighted: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  iconBadge: {
    width: 30,
    height: 30,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  iconBadgeHighlighted: { backgroundColor: "rgba(255, 255, 255, 0.18)" },
  value: {
    fontSize: fontSize.title,
    fontFamily: appFonts.extraBold,
    letterSpacing: -0.3,
    color: colors.text,
    fontVariant: ["tabular-nums"],
  },
  valueHighlighted: { color: colors.white },
  label: { fontSize: fontSize.label, color: colors.textSecondary, fontFamily: appFonts.semibold },
  labelHighlighted: { color: colors.white, opacity: 0.85 },
});
