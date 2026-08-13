import { MD3DarkTheme } from "react-native-paper";
import { paperTheme } from "./paper";
import { colors } from "./colors";
import { appFonts } from "./fonts";

describe("paper theme", () => {
  it("extends the MD3 dark theme", () => {
    expect(paperTheme.isV3).toBe(true);
    expect(paperTheme.dark).toBe(true);
    expect(paperTheme.version).toBe(MD3DarkTheme.version);
    expect(paperTheme.mode).toBe(MD3DarkTheme.mode);
    expect(paperTheme.animation).toBe(MD3DarkTheme.animation);
    expect(paperTheme.roundness).toBe(3);
  });

  it("uses Roboto with MD3 weights", () => {
    expect(paperTheme.fonts.bodyMedium.fontFamily).toBe(appFonts.regular);
    expect(paperTheme.fonts.bodyMedium.fontWeight).toBe("400");
    expect(paperTheme.fonts.labelLarge.fontFamily).toBe(appFonts.medium);
    expect(paperTheme.fonts.labelLarge.fontWeight).toBe("500");
    expect(paperTheme.fonts.labelSmall.fontFamily).toBe(appFonts.medium);
  });

  it("maps the brand palette onto Material 3 roles", () => {
    expect(paperTheme.colors.primary).toBe(colors.primary);
    expect(paperTheme.colors.onPrimary).toBe(colors.white);
    expect(paperTheme.colors.background).toBe(colors.bg);
    expect(paperTheme.colors.surface).toBe(colors.surfaceElevated);
    expect(paperTheme.colors.onSurface).toBe(colors.text);
    expect(paperTheme.colors.onSurfaceVariant).toBe(colors.textSecondary);
    expect(paperTheme.colors.outline).toBe(colors.border);
    expect(paperTheme.colors.error).toBe(colors.danger);
    expect(paperTheme.colors.errorContainer).toBe(colors.dangerFill);
  });
});
