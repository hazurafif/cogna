import React from "react";
import { ActivityIndicator } from "react-native";
import { Button as BnaButton } from "./ui/button";
import { useColor } from "../hooks/useColor";
import { appFonts } from "../theme/fonts";
import { spacing } from "../theme/tokens";

export type ButtonVariant = "primary" | "outline" | "danger";

type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  testID?: string;
};

/**
 * Cogna's Button — a thin wrapper over the BNA UI button.
 *
 * Maps Cogna's three brand variants onto BNA's `default` / `outline` /
 * `destructive` and renders the loading spinner itself so it keeps a stable
 * `button-loading` testID while the BNA button stays disabled underneath.
 */
export function Button({
  title,
  onPress,
  variant = "primary",
  disabled,
  loading,
  testID,
}: ButtonProps) {
  const blocked = disabled || loading;
  const isOutline = variant === "outline";
  const primaryColor = useColor("primary");
  const primaryForegroundColor = useColor("primaryForeground");
  const spinnerColor = isOutline ? primaryColor : primaryForegroundColor;

  const bnaVariant =
    variant === "danger"
      ? "destructive"
      : isOutline
        ? "outline"
        : "default";

  return (
    <BnaButton
      variant={bnaVariant}
      onPress={onPress}
      disabled={blocked}
      loading={false}
      animation={false}
      haptic={false}
      testID={testID ?? "button"}
      style={styles.button}
      textStyle={styles.label}
    >
      {loading ? (
        <ActivityIndicator
          testID="button-loading"
          size={18}
          color={spinnerColor}
        />
      ) : (
        title
      )}
    </BnaButton>
  );
}

const styles = {
  button: {
    alignSelf: "stretch",
    paddingHorizontal: spacing.xl,
  },
  label: {
    fontFamily: appFonts.bold,
    letterSpacing: 0.2,
  },
} as const;
