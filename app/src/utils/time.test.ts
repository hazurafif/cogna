import { formatDuration, formatMinutes, localISO, todayDate } from "./time";

describe("time utils", () => {
  it("formats durations", () => {
    expect(formatDuration(45)).toBe("45m");
    expect(formatDuration(90)).toBe("1h 30m");
    expect(formatDuration(720)).toBe("12h 0m");
  });

  it("formats minutes compactly", () => {
    expect(formatMinutes(0)).toBe("0m");
    expect(formatMinutes(45)).toBe("45m");
    expect(formatMinutes(125)).toBe("2h 5m");
  });

  it("produces local ISO timestamps without zone", () => {
    const d = new Date(2026, 6, 31, 9, 5, 3);
    expect(localISO(d)).toBe("2026-07-31T09:05:03");
  });

  it("produces today's date string", () => {
    expect(todayDate()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
