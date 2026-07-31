import React from "react";
import { StyleSheet, View } from "react-native";
import { colors } from "../theme/colors";
import { radius, spacing } from "../theme/tokens";

type CardProps = {
  children: React.ReactNode;
};

export function Card({ children }: CardProps) {
  return <View style={styles.card}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
  },
});
