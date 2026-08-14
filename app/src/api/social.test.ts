import {
  addKudos,
  fetchFeed,
  fetchFollowing,
  fetchLeaderboard,
  followUser,
  removeKudos,
  searchUsers,
  unfollowUser,
} from "./social";

describe("social API", () => {
  const mockFetch = jest.fn();
  beforeEach(() => {
    global.fetch = mockFetch as unknown as typeof fetch;
    mockFetch.mockReset();
  });

  it("searches users with an encoded query", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ users: [] }) });
    await searchUsers("tok", "bob@example.com");
    expect(mockFetch.mock.calls[0][0]).toContain("/api/v1/users/search?q=bob%40example.com");
  });

  it("follows and unfollows a user", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ following: true }) });
    await followUser("tok", 7);
    expect(mockFetch.mock.calls[0][1].method).toBe("POST");
    expect(mockFetch.mock.calls[0][0]).toContain("/api/v1/users/7/follow");

    await unfollowUser("tok", 7);
    expect(mockFetch.mock.calls[1][1].method).toBe("DELETE");
  });

  it("fetches following, feed and leaderboard", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) });
    await fetchFollowing("tok");
    expect(mockFetch.mock.calls[0][0]).toContain("/api/v1/follows");

    await fetchFeed("tok");
    expect(mockFetch.mock.calls[1][0]).toContain("/api/v1/feed");

    await fetchLeaderboard("tok");
    expect(mockFetch.mock.calls[2][0]).toContain("/api/v1/leaderboard");
  });

  it("adds and removes kudos on a session", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ kudos: true }) });
    await addKudos("tok", 42);
    expect(mockFetch.mock.calls[0][1].method).toBe("POST");
    expect(mockFetch.mock.calls[0][0]).toContain("/api/v1/sessions/42/kudos");

    await removeKudos("tok", 42);
    expect(mockFetch.mock.calls[1][1].method).toBe("DELETE");
  });
});
