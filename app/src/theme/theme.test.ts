import { Colors, withOpacity } from "./colors";
import { fontSize, radius, spacing } from "./tokens";

describe("theme tokens", () => {
  it("exposes light and dark schemes in the BNA UI shape", () => {
    expect(Object.keys(Colors)).toEqual(["light", "dark"]);
    for (const scheme of ["light", "dark"] as const) {
      const palette = Colors[scheme];
      for (const key of [
        "background",
        "foreground",
        "card",
        "cardForeground",
        "popover",
        "popoverForeground",
        "primary",
        "primaryForeground",
        "secondary",
        "secondaryForeground",
        "muted",
        "mutedForeground",
        "accent",
        "accentForeground",
        "destructive",
        "destructiveForeground",
        "border",
        "input",
        "ring",
        "text",
        "textMuted",
      ]) {
        expect(palette[key as keyof typeof palette]).toEqual(expect.any(String));
      }
    }
  });

  it("uses the stock BNA light palette", () => {
    expect(Colors.light.background).toBe("#FFFFFF");
    expect(Colors.light.foreground).toBe("#000000");
    expect(Colors.light.card).toBe("#F2F2F7");
    expect(Colors.light.primary).toBe("#18181b");
    expect(Colors.light.primaryForeground).toBe("#FFFFFF");
    expect(Colors.light.border).toBe("#C6C6C8");
    expect(Colors.light.text).toBe("#000000");
    expect(Colors.light.textMuted).toBe("#71717a");
    expect(Colors.light.destructive).toBe("#ef4444");
  });

  it("uses the stock BNA dark palette", () => {
    expect(Colors.dark.background).toBe("#000000");
    expect(Colors.dark.foreground).toBe("#FFFFFF");
    expect(Colors.dark.card).toBe("#1C1C1E");
    expect(Colors.dark.primary).toBe("#e4e4e7");
    expect(Colors.dark.primaryForeground).toBe("#18181b");
    expect(Colors.dark.border).toBe("#38383A");
    expect(Colors.dark.text).toBe("#FFFFFF");
    expect(Colors.dark.textMuted).toBe("#a1a1aa");
    expect(Colors.dark.destructive).toBe("#dc2626");
  });

  it("derives rgba shades from hex colors with withOpacity", () => {
    expect(withOpacity("#18181b", 0.2)).toBe("rgba(24, 24, 27, 0.2)");
    expect(withOpacity("rgba(255, 255, 255, 0.15)", 0.5)).toBe(
      "rgba(255, 255, 255, 0.15)",
    );
  });

  it("defines radii, spacing and font sizes", () => {
    expect(radius).toEqual({ sm: 10, md: 14, lg: 20, full: 999 });
    expect(spacing).toEqual({ xs: 4, sm: 8, md: 12, lg: 16, xl: 24 });
    expect(fontSize).toEqual({
      label: 10, caption: 12, body: 14, title: 16, heading: 24, hero: 44,
    });
  });
});
