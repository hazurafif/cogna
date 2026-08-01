import React from "react";
import { StyleSheet, View } from "react-native";
import { colors } from "../theme/colors";
import { radius, shadow, spacing } from "../theme/tokens";

type CardProps = {
  children: React.ReactNode;
};

export function Card({ children }: CardProps) {
  return <View style={styles.card}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
});
