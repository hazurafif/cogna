import React from "react";
import { Pressable, StyleSheet } from "react-native";
import { Text } from "./ui/text";
import { useColor } from "../hooks/useColor";
import { appFonts } from "../theme/fonts";
import { fontSize, radius, spacing } from "../theme/tokens";

type ChipProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  testID?: string;
};

/**
 * Cogna's Chip — a BNA-themed filter pill. Selected chips fill with the
 * primary colour; unselected ones sit on the card surface with a hairline
 * border.
 */
export function Chip({ label, selected, onPress, testID }: ChipProps) {
  const primaryColor = useColor("primary");
  const foregroundColor = useColor("primaryForeground");
  const cardColor = useColor("card");
  const borderColor = useColor("border");
  const textColor = useColor("text");

  return (
    <Pressable
      testID={testID ?? "chip"}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: selected ? primaryColor : cardColor,
          borderColor: selected ? primaryColor : borderColor,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <Text
        style={[
          styles.label,
          { color: selected ? foregroundColor : textColor },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.full,
    borderWidth: 1,
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.sm + 2,
  },
  label: {
    fontSize: fontSize.body,
    fontFamily: appFonts.semibold,
  },
});
