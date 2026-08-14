import React from "react";
import { StyleProp, StyleSheet, ViewStyle } from "react-native";
import { Card as BnaCard } from "./ui/card";
import { useColor } from "../hooks/useColor";
import { radius, spacing } from "../theme/tokens";

type CardProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

/**
 * Cogna's Card — the BNA UI card with a hairline border and the app's spacing.
 * Colours come straight from the BNA theme (`card` surface, `border` hairline).
 */
export function Card({ children, style }: CardProps) {
  const borderColor = useColor("border");

  return (
    <BnaCard
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
