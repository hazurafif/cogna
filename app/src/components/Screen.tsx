import React from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { Text } from "react-native-paper";
import { colors } from "../theme/colors";
import { spacing } from "../theme/tokens";

type ScreenProps = {
  title?: string;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
};

export function Screen({ title, style, children }: ScreenProps) {
  return (
    <View style={[styles.container, style]}>
      {title ? (
        <Text variant="headlineSmall" style={styles.title}>
          {title}
        </Text>
      ) : null}
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
    fontWeight: "800",
    letterSpacing: -0.5,
    color: colors.text,
  },
});
