import React from "react";
import { ActivityIndicator, StyleSheet } from "react-native";
import { Button as PaperButton } from "react-native-paper";
import { colors } from "../theme/colors";
import { appFonts } from "../theme/fonts";
import { radius, spacing } from "../theme/tokens";

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
 * Cogna's Button — a Material Design 3 button (React Native Paper).
 *
 * The loading spinner is rendered through Paper's icon slot so it keeps a
 * stable `button-loading` testID.
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
  const isDanger = variant === "danger";
  const isOutline = variant === "outline";
  const spinnerColor = isOutline ? colors.primary : colors.white;

  return (
    <PaperButton
      mode={isOutline ? "outlined" : "contained"}
      onPress={onPress}
      disabled={blocked}
      loading={false}
      testID={testID ?? "button"}
      style={styles.button}
      contentStyle={styles.content}
      labelStyle={styles.label}
      buttonColor={isDanger ? colors.dangerFill : undefined}
      textColor={isDanger ? colors.white : undefined}
      icon={
        loading
          ? () => (
              <ActivityIndicator
                testID="button-loading"
                size={18}
                color={spinnerColor}
              />
            )
          : undefined
      }
    >
      {title}
    </PaperButton>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: radius.full,
    minHeight: 50,
    alignSelf: "stretch",
  },
  content: {
    minHeight: 50,
    paddingHorizontal: spacing.xl,
  },
  label: {
    fontFamily: appFonts.bold,
    letterSpacing: 0.2,
  },
});
