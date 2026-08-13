import { configureFonts, MD3DarkTheme } from "react-native-paper";
import { colors } from "./colors";
import { appFonts } from "./fonts";

const baseFontConfig = {
  fontFamily: appFonts.regular,
  fontWeight: "400" as const,
  letterSpacing: 0.25,
  lineHeight: 20,
  fontSize: 14,
};

const fonts = configureFonts({ config: baseFontConfig, isV3: true });

/**
 * Material Design 3 (dark) theme for the whole app, built on React Native
 * Paper's MD3DarkTheme with Cogna's brand palette and Roboto typography.
 */
export const paperTheme = {
  ...MD3DarkTheme,
  roundness: 3,
  fonts: {
    ...fonts,
    // MD3 label styles use weight 500.
    labelLarge: { ...fonts.labelLarge, fontFamily: appFonts.medium, fontWeight: "500" as const },
    labelMedium: { ...fonts.labelMedium, fontFamily: appFonts.medium, fontWeight: "500" as const },
    labelSmall: { ...fonts.labelSmall, fontFamily: appFonts.medium, fontWeight: "500" as const },
  },
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
