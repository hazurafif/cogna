import { fetchSummary } from "./stats";

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
