import { fetchCurrentChallenge } from "./challenges";

describe("challenges API", () => {
  const mockFetch = jest.fn();
  beforeEach(() => {
    global.fetch = mockFetch as unknown as typeof fetch;
    mockFetch.mockReset();
  });

  it("fetches the current challenge with the token", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) });
    await fetchCurrentChallenge("tok");
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/challenges/current"),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer tok" }),
      }),
    );
  });

  it("resolves with the challenge progress payload", async () => {
    const progress = {
      challenge: {
        code: "weekly_420",
        name: "7-hour week",
        description: "Study 7 hours this week",
        target: 420,
        unit: "minutes",
      },
      value: 210,
      completed: false,
      days_left: 3,
    };
    mockFetch.mockResolvedValue({ ok: true, json: async () => progress });
    await expect(fetchCurrentChallenge("tok")).resolves.toEqual(progress);
  });
});
