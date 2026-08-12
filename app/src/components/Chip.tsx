import React from "react";
import { StyleSheet } from "react-native";
import { Chip as PaperChip } from "react-native-paper";
import { colors } from "../theme/colors";
import { radius } from "../theme/tokens";

type ChipProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  testID?: string;
};

/**
 * Cogna's Chip — a Material Design 3 filter chip (React Native Paper).
 */
export function Chip({ label, selected, onPress, testID }: ChipProps) {
  return (
    <PaperChip
      selected={selected}
      onPress={onPress}
      testID={testID ?? "chip"}
      selectedColor={colors.white}
      textStyle={selected ? { color: colors.white } : undefined}
      style={[
        styles.base,
        selected ? styles.selected : styles.unselected,
      ]}
    >
      {label}
    </PaperChip>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.full,
    borderWidth: 1,
  },
  selected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  unselected: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
});
