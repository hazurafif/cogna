import React from "react";
import { StyleProp, StyleSheet, ViewStyle } from "react-native";
import { Text } from "./ui/text";
import { View } from "./ui/view";
import { useColor } from "../hooks/useColor";
import { appFonts } from "../theme/fonts";
import { spacing } from "../theme/tokens";

type ScreenProps = {
  title?: string;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
};

/**
 * Cogna's Screen — a BNA `View` filling the themed background, with an
 * optional BNA heading. Screens live inside tab/stack navigators that already
 * handle safe areas.
 */
export function Screen({ title, style, children }: ScreenProps) {
  const background = useColor("background");

  return (
    <View style={[styles.container, { backgroundColor: background }, style]}>
      {title ? (
        <Text variant="title" style={styles.title}>
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
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: {
    fontFamily: appFonts.extraBold,
    letterSpacing: -0.5,
  },
});
