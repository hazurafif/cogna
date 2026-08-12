import React from "react";
import { StyleSheet } from "react-native";
import { Card as PaperCard } from "react-native-paper";
import { colors } from "../theme/colors";
import { radius, spacing } from "../theme/tokens";

type CardProps = {
  children: React.ReactNode;
};

/**
 * Cogna's Card — a Material Design 3 contained card (React Native Paper).
 */
export function Card({ children }: CardProps) {
  return (
    <PaperCard mode="contained" style={styles.card}>
      <PaperCard.Content style={styles.content}>{children}</PaperCard.Content>
    </PaperCard>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
  },
  content: {
    padding: spacing.lg,
  },
});
