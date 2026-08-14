import React from "react";
import { StyleSheet } from "react-native";
import { LucideIcon } from "lucide-react-native";
import { Text } from "./ui/text";
import { View } from "./ui/view";
import { Icon } from "./ui/icon";
import { useColor } from "../hooks/useColor";
import { appFonts } from "../theme/fonts";
import { fontSize, radius, spacing } from "../theme/tokens";

type StatCardProps = {
  icon: LucideIcon;
  value: string;
  label: string;
  highlighted?: boolean;
};

/**
 * Cogna's StatCard — a BNA `View` with a centred metric. The highlighted
 * variant flips to the primary fill for the streak card.
 */
export function StatCard({
  icon: IconGlyph,
  value,
  label,
  highlighted,
}: StatCardProps) {
  const primaryColor = useColor("primary");
  const primaryForegroundColor = useColor("primaryForeground");
  const cardColor = useColor("card");
  const borderColor = useColor("border");
  const textColor = useColor("text");
  const accentColor = useColor("accent");
  const mutedColor = useColor("textMuted");

  const tint = highlighted ? primaryForegroundColor : primaryColor;

  return (
    <View
      testID="stat-card"
      style={StyleSheet.flatten([
        styles.card,
        {
          backgroundColor: highlighted ? primaryColor : cardColor,
          borderColor: highlighted ? primaryColor : borderColor,
        },
      ])}
    >
      <View
        style={[
          styles.iconBadge,
          { backgroundColor: highlighted ? "rgba(255, 255, 255, 0.18)" : accentColor },
        ]}
      >
        <Icon name={IconGlyph} size={14} strokeWidth={2.5} color={tint} />
      </View>
      <Text
        style={[
          styles.value,
          { color: highlighted ? primaryForegroundColor : textColor },
        ]}
      >
        {value}
      </Text>
      <Text
        style={[
          styles.label,
          {
            color: highlighted ? primaryForegroundColor : mutedColor,
            opacity: highlighted ? 0.85 : 1,
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    paddingTop: spacing.lg,
    alignItems: "center",
    gap: spacing.xs,
  },
  iconBadge: {
    width: 30,
    height: 30,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  value: {
    fontSize: fontSize.title,
    fontFamily: appFonts.extraBold,
    letterSpacing: -0.3,
    fontVariant: ["tabular-nums"],
  },
  label: {
    fontSize: fontSize.label,
    fontFamily: appFonts.semibold,
  },
});
