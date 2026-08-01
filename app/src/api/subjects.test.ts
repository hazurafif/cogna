import { listSubjects } from "./subjects";

describe("subjects API", () => {
  const mockFetch = jest.fn();
  beforeEach(() => {
    global.fetch = mockFetch as unknown as typeof fetch;
    mockFetch.mockReset();
  });

  it("lists the catalog with the token", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => [] });
    await listSubjects("tok");
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/subjects"),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer tok" }),
      }),
    );
  });
});
