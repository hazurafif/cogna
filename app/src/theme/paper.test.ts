import { MD3DarkTheme } from "react-native-paper";
import { paperTheme } from "./paper";
import { colors } from "./colors";

describe("paper theme", () => {
  it("extends the MD3 dark theme", () => {
    expect(paperTheme.isV3).toBe(true);
    expect(paperTheme.dark).toBe(true);
    expect(paperTheme.version).toBe(MD3DarkTheme.version);
    expect(paperTheme.mode).toBe(MD3DarkTheme.mode);
    expect(paperTheme.fonts).toBe(MD3DarkTheme.fonts);
    expect(paperTheme.animation).toBe(MD3DarkTheme.animation);
    expect(paperTheme.roundness).toBe(3);
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
