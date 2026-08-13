/**
 * Roboto font family names, registered at app startup through
 * `@expo-google-fonts/roboto` (see src/app/_layout.tsx). Kept as plain
 * string constants so this module stays importable in unit tests.
 */
export const appFonts = {
  regular: "Roboto_400Regular",
  medium: "Roboto_500Medium",
  semibold: "Roboto_600SemiBold",
  bold: "Roboto_700Bold",
  extraBold: "Roboto_800ExtraBold",
} as const;
