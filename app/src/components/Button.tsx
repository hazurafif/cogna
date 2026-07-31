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
  primary: { backgroundColor: colors.primary },
  outline: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
  danger: { backgroundColor: "#DC2626" },
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
      style={[styles.base, variantStyles[variant], blocked && styles.blocked]}
    >
      {loading ? (
        <ActivityIndicator
          testID="button-loading"
          color={variant === "outline" ? colors.primary : "#fff"}
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
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  blocked: { opacity: 0.5 },
  label: { color: "#fff", fontSize: fontSize.title, fontWeight: "600" },
  outlineLabel: { color: colors.text },
});
