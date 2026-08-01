import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { CircleCheck } from "lucide-react-native";
import { colors } from "../theme/colors";
import { fontSize, radius } from "../theme/tokens";

type ChipProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
};

export function Chip({ label, selected, onPress }: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.base, selected && styles.selected, pressed && styles.pressed]}
      accessibilityState={{ selected: !!selected }}
    >
      {selected ? <CircleCheck size={14} color={colors.white} /> : null}
      <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  selected: { backgroundColor: colors.primary, borderColor: colors.primary },
  pressed: { opacity: 0.8 },
  label: { color: colors.textSecondary, fontSize: fontSize.body },
  labelSelected: { color: colors.white, fontWeight: "600" },
});
