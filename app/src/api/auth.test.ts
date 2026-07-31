import { fetchMe, login, register } from "./auth";
import { API_URL } from "./config";

describe("auth api", () => {
  const mockFetch = jest.fn();

  beforeEach(() => {
    global.fetch = mockFetch as unknown as typeof fetch;
    mockFetch.mockReset();
  });

  it("logs in with email and password", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        token: "tok",
        user: { id: 1, email: "me@example.com", created_at: "2026-07-31T00:00:00" },
      }),
    });

    const res = await login("me@example.com", "password123");

    expect(mockFetch).toHaveBeenCalledWith(
      `${API_URL}/api/v1/auth/login`,
      expect.objectContaining({
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: "me@example.com", password: "password123" }),
      }),
    );
    expect(res.token).toBe("tok");
    expect(res.user.email).toBe("me@example.com");
  });

  it("registers with email and password", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        token: "reg-tok",
        user: { id: 2, email: "new@example.com", created_at: "2026-07-31T00:00:00" },
      }),
    });

    const res = await register("new@example.com", "password123");

    expect(mockFetch).toHaveBeenCalledWith(
      `${API_URL}/api/v1/auth/register`,
      expect.objectContaining({
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: "new@example.com", password: "password123" }),
      }),
    );
    expect(res.token).toBe("reg-tok");
  });

  it("fetches the current user with the bearer token", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        user: { id: 3, email: "me@example.com", created_at: "2026-07-31T00:00:00" },
      }),
    });

    const res = await fetchMe("tok");

    expect(mockFetch).toHaveBeenCalledWith(
      `${API_URL}/api/v1/me`,
      expect.objectContaining({
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer tok",
        },
      }),
    );
    expect(res.user.email).toBe("me@example.com");
  });
});
