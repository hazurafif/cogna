import React from "react";
import { StyleProp, StyleSheet, ViewStyle } from "react-native";
import { Card as BnaCard } from "./ui/card";
import { useColor } from "../hooks/useColor";
import { radius, spacing } from "../theme/tokens";

type CardProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Extra props (e.g. testID) forwarded to the BNA card. */
  testID?: string;
};

/**
 * Cogna's Card — the BNA UI card with a hairline border and the app's spacing.
 * Colours come straight from the BNA theme (`card` surface, `border` hairline).
 */
export function Card({ children, style, testID }: CardProps) {
  const borderColor = useColor("border");

  return (
    <BnaCard
      testID={testID}
      style={StyleSheet.flatten([
        {
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor,
          padding: spacing.lg,
        },
        style,
      ]) as ViewStyle}
    >
      {children}
    </BnaCard>
  );
}
