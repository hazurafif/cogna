import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { YouScreen } from "./YouScreen";
import { useAuth } from "../auth/AuthContext";
import { fetchSummary } from "../api/stats";
import { listSessions } from "../api/sessions";

jest.mock("../auth/AuthContext", () => ({ useAuth: jest.fn() }));
jest.mock("../api/stats", () => ({ fetchSummary: jest.fn() }));
jest.mock("../api/sessions", () => ({ listSessions: jest.fn() }));
jest.mock("expo-router", () => {
  const React = require("react");
  return { useFocusEffect: (cb: () => void) => React.useEffect(cb, [cb]) };
});

const mockUseAuth = useAuth as jest.Mock;
const mockFetchSummary = fetchSummary as jest.Mock;
const mockListSessions = listSessions as jest.Mock;
const mockLogout = jest.fn();

const now = new Date();
const p = (n: number) => String(n).padStart(2, "0");
const iso = (daysAgo: number, hour: number) => {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo, hour);
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(hour)}:00:00`;
};
const dayKey = (daysAgo: number) => iso(daysAgo, 0).slice(0, 10);

function session(id: number, subjectName: string, minutes: number, startedAt: string) {
  return {
    id, user_id: 1, subject_id: 1, subject_name: subjectName, subject_icon: "book-open",
    started_at: startedAt, ended_at: startedAt,
    duration_minutes: minutes, source: "timer" as const, note: null, created_at: "",
  };
}

const summary = {
  total_minutes: 150,
  week_minutes: 60,
  streak_days: 3,
  per_subject: [
    { subject_id: 1, name: "math", icon: "calculator", minutes: 90 },
    { subject_id: 2, name: "reading", icon: "book-open", minutes: 60 },
  ],
};

describe("YouScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      token: "tok",
      user: { id: 1, email: "rafif@example.com", created_at: "2026-07-01T10:00:00" },
      logout: mockLogout,
    });
    mockListSessions.mockResolvedValue([]);
  });

  it("shows the profile card with member-since date", async () => {
    mockFetchSummary.mockResolvedValue(summary);

    const { getByText } = await render(<YouScreen />);

    await waitFor(() => expect(getByText("rafif@example.com")).toBeTruthy());
    expect(getByText("R")).toBeTruthy();
    expect(getByText("Member since Jul 2026")).toBeTruthy();
  });

  it("shows totals and the best streak from sessions", async () => {
    mockFetchSummary.mockResolvedValue(summary);
    mockListSessions.mockResolvedValue([
      session(1, "math", 60, iso(0, 9)),
      session(2, "math", 60, iso(1, 9)),
      session(3, "math", 60, iso(2, 9)),
      session(4, "math", 60, iso(3, 9)),
      session(5, "math", 60, iso(4, 9)),
    ]);

    const { getByText } = await render(<YouScreen />);

    await waitFor(() => expect(getByText("2h 30m")).toBeTruthy());
    expect(getByText("1h 0m")).toBeTruthy();
    expect(getByText("3 days")).toBeTruthy();
    expect(getByText("5 days")).toBeTruthy();
  });

  it("renders the heatmap calendar with intensity-colored cells", async () => {
    mockFetchSummary.mockResolvedValue(summary);
    mockListSessions.mockResolvedValue([
      session(1, "math", 150, iso(0, 9)), // intensity 4 (>= 120m)
      session(2, "math", 20, iso(3, 9)), // intensity 1 (< 30m)
    ]);

    const { getByTestId, getByText } = await render(<YouScreen />);

    await waitFor(() => expect(getByText("Activity calendar")).toBeTruthy());
    await waitFor(() => expect(getByTestId(`heat-cell-${dayKey(0)}`)).toBeTruthy());

    const cellColor = (key: string) => getByTestId(`heat-cell-${key}`).props.style[1].backgroundColor;
    expect(cellColor(dayKey(0))).toBe("#FC4C02");
    expect(cellColor(dayKey(3))).toBe("rgba(252, 76, 2, 0.2)");
    expect(cellColor(dayKey(2))).toBe("#1B2230"); // no activity -> blank
  });

  it("shows the subject breakdown with labels and totals", async () => {
    mockFetchSummary.mockResolvedValue(summary);

    const { getByText } = await render(<YouScreen />);

    await waitFor(() => expect(getByText("By subject")).toBeTruthy());
    expect(getByText("Math")).toBeTruthy();
    expect(getByText("Reading")).toBeTruthy();
    expect(getByText("1h 30m")).toBeTruthy();
    expect(getByText("1h 0m")).toBeTruthy();
  });

  it("shows the weekly chart", async () => {
    mockFetchSummary.mockResolvedValue(summary);
    mockListSessions.mockResolvedValue([session(1, "math", 60, iso(0, 9))]);

    const { getByText } = await render(<YouScreen />);

    await waitFor(() => expect(getByText("Last 8 weeks")).toBeTruthy());
    expect(getByText("1h 0m")).toBeTruthy();
  });

  it("shows streak milestones and the next one", async () => {
    mockFetchSummary.mockResolvedValue({ ...summary, streak_days: 7 });
    mockListSessions.mockResolvedValue([session(1, "math", 60, iso(0, 9))]);

    const { getByText } = await render(<YouScreen />);

    await waitFor(() => expect(getByText("7-day streak")).toBeTruthy());
    expect(getByText("7 days to your 14-day milestone")).toBeTruthy();
    expect(getByText("Keep it alive today")).toBeTruthy();
  });

  it("logs out from the profile card", async () => {
    mockFetchSummary.mockResolvedValue(summary);

    const { getByTestId } = await render(<YouScreen />);
    await waitFor(() => expect(getByTestId("logout-button")).toBeTruthy());
    await fireEvent.press(getByTestId("logout-button"));
    expect(mockLogout).toHaveBeenCalled();
  });

  it("shows an error when stats fail to load", async () => {
    mockFetchSummary.mockRejectedValue(new Error("boom"));

    const { getByText } = await render(<YouScreen />);
    await waitFor(() => expect(getByText(/could not load stats/i)).toBeTruthy());
  });
});
