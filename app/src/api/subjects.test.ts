import { createSubject, deleteSubject, listSubjects } from "./subjects";

describe("subjects API", () => {
  const mockFetch = jest.fn();
  beforeEach(() => {
    global.fetch = mockFetch as unknown as typeof fetch;
    mockFetch.mockReset();
  });

  it("lists subjects with the token", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => [] });
    await listSubjects("tok");
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/subjects"),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer tok" }),
      }),
    );
  });

  it("creates a subject", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ id: 1 }) });
    await createSubject("tok", "Math", "book-open");
    const [, options] = mockFetch.mock.calls[0];
    expect(options.method).toBe("POST");
    expect(JSON.parse(options.body)).toEqual({ name: "Math", icon: "book-open" });
  });

  it("deletes a subject with DELETE", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) });
    await deleteSubject("tok", 7);
    expect(mockFetch.mock.calls[0][1].method).toBe("DELETE");
  });
});
