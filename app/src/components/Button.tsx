import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import { colors } from "../theme/colors";
import { fontSize, radius } from "../theme/tokens";

export type ButtonVariant = "primary" | "outline" | "danger";

type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  testID?: string;
};

const variantStyles = {
  primary: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  outline: { backgroundColor: colors.surfaceElevated, borderColor: colors.border, borderWidth: 1 },
  danger: { backgroundColor: colors.dangerFill },
} as const;

export function Button({
  title,
  onPress,
  variant = "primary",
  disabled,
  loading,
  testID,
}: ButtonProps) {
  const blocked = disabled || loading;
  return (
    <Pressable
      testID={testID ?? "button"}
      onPress={onPress}
      disabled={blocked}
      accessibilityState={{ disabled: blocked }}
      style={({ pressed }) => [
        styles.base,
        variantStyles[variant],
        blocked && styles.blocked,
        pressed && !blocked && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          testID="button-loading"
          color={variant === "outline" ? colors.primary : colors.white}
        />
      ) : (
        <Text style={[styles.label, variant === "outline" && styles.outlineLabel]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.full,
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  blocked: { opacity: 0.5 },
  label: { color: colors.white, fontSize: fontSize.title, fontWeight: "700", letterSpacing: 0.2 },
  outlineLabel: { color: colors.text },
});
