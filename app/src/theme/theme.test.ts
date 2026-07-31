import { colors } from "./colors";
import { fontSize, radius, spacing } from "./tokens";

describe("theme tokens", () => {
  it("defines the dark palette exactly", () => {
    expect(colors.bg).toBe("#0F1115");
    expect(colors.surface).toBe("#1A1D24");
    expect(colors.border).toBe("#262B35");
    expect(colors.primary).toBe("#FC4C02");
    expect(colors.text).toBe("#E5E7EB");
    expect(colors.textSecondary).toBe("#9CA3AF");
    expect(colors.textMuted).toBe("#6B7280");
    expect(colors.danger).toBe("#F87171");
  });

  it("defines six subject accents", () => {
    expect(colors.subjects).toEqual([
      "#FC4C02", "#22C55E", "#38BDF8", "#8B5CF6", "#F59E0B", "#F43F5E",
    ]);
  });

  it("defines radii, spacing and font sizes", () => {
    expect(radius).toEqual({ sm: 10, md: 14, full: 999 });
    expect(spacing).toEqual({ xs: 4, sm: 8, md: 12, lg: 16, xl: 24 });
    expect(fontSize).toEqual({
      label: 10, caption: 12, body: 14, title: 16, heading: 24, hero: 44,
    });
  });
});
