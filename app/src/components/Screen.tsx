import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";
import { fontSize, spacing } from "../theme/tokens";

type ScreenProps = {
  title?: string;
  children: React.ReactNode;
};

export function Screen({ title, children }: ScreenProps) {
  return (
    <View style={styles.container}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: {
    fontSize: fontSize.heading,
    fontWeight: "800",
    letterSpacing: -0.5,
    color: colors.text,
  },
});
