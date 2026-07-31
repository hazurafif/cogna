import { ApiError, api } from "./client";
import { API_URL } from "./config";

describe("api client", () => {
  const mockFetch = jest.fn();

  beforeEach(() => {
    global.fetch = mockFetch as unknown as typeof fetch;
    mockFetch.mockReset();
  });

  it("sends method, JSON body and bearer token", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ id: 1 }),
    });

    await api<{ id: number }>("/api/v1/sessions", {
      method: "POST",
      body: { subject_id: 2 },
      token: "abc",
    });

    expect(mockFetch).toHaveBeenCalledWith(
      `${API_URL}/api/v1/sessions`,
      expect.objectContaining({
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer abc",
        },
        body: JSON.stringify({ subject_id: 2 }),
      }),
    );
  });

  it("parses the error envelope", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({ error: { code: "email_taken", message: "taken" } }),
    });

    await expect(api("/api/v1/auth/register", { method: "POST", body: {} })).rejects.toThrow(
      ApiError,
    );
    try {
      await api("/x");
    } catch (err) {
      const apiErr = err as ApiError;
      expect(apiErr.status).toBe(409);
      expect(apiErr.code).toBe("email_taken");
    }
  });

  it("falls back to a generic error for non-JSON bodies", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error("not json");
      },
    });

    try {
      await api("/x");
      throw new Error("should have thrown");
    } catch (err) {
      const apiErr = err as ApiError;
      expect(apiErr.code).toBe("unknown_error");
      expect(apiErr.message).toContain("500");
    }
  });
});
