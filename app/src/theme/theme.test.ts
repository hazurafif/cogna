import { colors } from "./colors";
import { fontSize, radius, spacing } from "./tokens";

describe("theme tokens", () => {
  it("defines the dark palette exactly", () => {
    expect(colors.bg).toBe("#0B0E14");
    expect(colors.surface).toBe("#141922");
    expect(colors.surfaceElevated).toBe("#1B2230");
    expect(colors.border).toBe("#242D3D");
    expect(colors.primary).toBe("#FC4C02");
    expect(colors.text).toBe("#EDF0F5");
    expect(colors.textSecondary).toBe("#A0A8B8");
    expect(colors.textMuted).toBe("#67708A");
    expect(colors.danger).toBe("#F87171");
    expect(colors.dangerFill).toBe("#DC2626");
    expect(colors.white).toBe("#FFFFFF");
  });

  it("defines six subject accents", () => {
    expect(colors.subjects).toEqual([
      "#FC4C02", "#22C55E", "#38BDF8", "#8B5CF6", "#F59E0B", "#F43F5E",
    ]);
  });

  it("defines radii, spacing and font sizes", () => {
    expect(radius).toEqual({ sm: 10, md: 14, lg: 20, full: 999 });
    expect(spacing).toEqual({ xs: 4, sm: 8, md: 12, lg: 16, xl: 24 });
    expect(fontSize).toEqual({
      label: 10, caption: 12, body: 14, title: 16, heading: 24, hero: 44,
    });
  });
});
