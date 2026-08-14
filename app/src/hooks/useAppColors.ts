import { useColor } from "./useColor";

/**
 * The app's flat colour names, resolved through BNA's `useColor` so every
 * value follows the active light/dark scheme. Kept for screens that style
 * themselves with `StyleSheet.create` — pass the result into a
 * `makeStyles(c)` factory rather than referencing a static import.
 */
export type AppColors = {
  bg: string;
  surface: string;
  surfaceElevated: string;
  border: string;
  primary: string;
  primarySoft: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  danger: string;
  dangerFill: string;
  white: string;
  onPrimary: string;
  authBg: string;
  authSurface: string;
  authBorder: string;
  authMuted: string;
};

export function useAppColors(): AppColors {
  return {
    bg: useColor("background"),
    surface: useColor("secondary"),
    surfaceElevated: useColor("card"),
    border: useColor("border"),
    primary: useColor("primary"),
    primarySoft: useColor("accent"),
    text: useColor("text"),
    textSecondary: useColor("icon"),
    textMuted: useColor("textMuted"),
    danger: useColor("error"),
    dangerFill: useColor("destructive"),
    white: useColor("foreground"),
    onPrimary: useColor("primaryForeground"),
    authBg: useColor("background"),
    authSurface: useColor("card"),
    authBorder: useColor("border"),
    authMuted: useColor("textMuted"),
  };
}
