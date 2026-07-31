import { createSession, listSessions } from "./sessions";

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
});
