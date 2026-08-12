import { MD3DarkTheme } from "react-native-paper";
import { colors } from "./colors";

/**
 * Material Design 3 (dark) theme for the whole app, built on React Native
 * Paper's MD3DarkTheme with Cogna's brand palette.
 */
export const paperTheme = {
  ...MD3DarkTheme,
  roundness: 3,
  colors: {
    ...MD3DarkTheme.colors,
    primary: colors.primary,
    onPrimary: colors.white,
    primaryContainer: colors.primarySoft,
    onPrimaryContainer: colors.text,
    secondaryContainer: colors.primary,
    onSecondaryContainer: colors.white,
    background: colors.bg,
    surface: colors.surfaceElevated,
    surfaceVariant: colors.surface,
    onSurface: colors.text,
    onSurfaceVariant: colors.textSecondary,
    outline: colors.border,
    outlineVariant: colors.border,
    error: colors.danger,
    onError: colors.white,
    errorContainer: colors.dangerFill,
    onErrorContainer: colors.white,
    surfaceDisabled: "rgba(237, 240, 245, 0.12)",
    onSurfaceDisabled: colors.textMuted,
    inverseSurface: colors.surface,
    inverseOnSurface: colors.text,
  },
} as const;
