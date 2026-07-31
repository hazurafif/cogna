import {
  createSession,
  deleteSession,
  getSession,
  listSessions,
  updateSession,
} from "./sessions";

describe("sessions API", () => {
  const mockFetch = jest.fn();
  beforeEach(() => {
    global.fetch = mockFetch as unknown as typeof fetch;
    mockFetch.mockReset();
  });

  it("creates a session", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ id: 1 }) });
    await createSession("tok", {
      subject_id: 3,
      started_at: "2026-07-31T09:00:00",
      ended_at: "2026-07-31T10:00:00",
      source: "timer",
    });
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain("/api/v1/sessions");
    expect(options.method).toBe("POST");
    expect(JSON.parse(options.body)).toMatchObject({ subject_id: 3, source: "timer" });
  });

  it("serializes query filters", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => [] });
    await listSessions("tok", { from: "2026-07-01", to: "2026-07-31", subject_id: 2 });
    expect(mockFetch.mock.calls[0][0]).toContain(
      "from=2026-07-01&to=2026-07-31&subject_id=2",
    );
  });

  it("gets a session by id", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ id: 5 }) });
    await getSession("tok", 5);
    expect(mockFetch.mock.calls[0][0]).toContain("/api/v1/sessions/5");
  });

  it("updates a session", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ id: 5 }) });
    await updateSession("tok", 5, {
      subject_id: 3,
      started_at: "2026-07-31T09:00:00",
      ended_at: "2026-07-31T10:00:00",
      source: "manual",
      note: "review",
    });
    const [, options] = mockFetch.mock.calls[0];
    expect(options.method).toBe("PUT");
    expect(JSON.parse(options.body)).toMatchObject({ subject_id: 3, note: "review" });
  });

  it("deletes a session with DELETE", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) });
    await deleteSession("tok", 5);
    expect(mockFetch.mock.calls[0][1].method).toBe("DELETE");
  });
});
