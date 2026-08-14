import { fetchSummary, fetchTrend } from "./stats";

describe("stats API", () => {
  const mockFetch = jest.fn();
  beforeEach(() => {
    global.fetch = mockFetch as unknown as typeof fetch;
    mockFetch.mockReset();
  });

  it("fetches the summary with the token", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => [] });
    await fetchSummary("tok");
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/stats/summary"),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer tok" }),
      }),
    );
  });

  it("resolves with the summary payload", async () => {
    const summary = {
      total_minutes: 150,
      week_minutes: 60,
      streak_days: 3,
      per_subject: [
        { subject_id: 1, name: "Math", icon: "book-open", minutes: 90 },
      ],
    };
    mockFetch.mockResolvedValue({ ok: true, json: async () => summary });
    await expect(fetchSummary("tok")).resolves.toEqual(summary);
  });
});

describe("fetchTrend", () => {
  const mockFetch = jest.fn();
  beforeEach(() => {
    global.fetch = mockFetch as unknown as typeof fetch;
    mockFetch.mockReset();
  });

  it("requests the trend window with the token", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) });
    await fetchTrend("tok", 14);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/stats/trend?days=14"),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer tok" }),
      }),
    );
  });

  it("resolves with the trend payload", async () => {
    const trend = {
      days: 30,
      daily: [{ date: "2026-07-02", minutes: 90 }],
      per_subject: [],
      total_minutes: 90,
      longest_session_minutes: 90,
      avg_per_day_minutes: 3,
      busiest_hour: 9,
    };
    mockFetch.mockResolvedValue({ ok: true, json: async () => trend });
    await expect(fetchTrend("tok")).resolves.toEqual(trend);
  });
});
