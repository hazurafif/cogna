import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";
import { HomeScreen } from "./HomeScreen";
import { useAuth } from "../auth/AuthContext";
import { listSessions } from "../api/sessions";
import { fetchSettings } from "../api/settings";
import { fetchSummary } from "../api/stats";
import { fetchCurrentChallenge } from "../api/challenges";
import { syncReminders } from "../notifications/reminders";

jest.mock("../auth/AuthContext", () => ({ useAuth: jest.fn() }));
jest.mock("../hooks/useModeToggle", () => ({
  useModeToggle: () => ({
    isDark: true,
    mode: "dark",
    setMode: jest.fn(),
    currentMode: "dark",
    toggleMode: jest.fn(),
  }),
}));
jest.mock("../api/sessions", () => ({ listSessions: jest.fn() }));
jest.mock("../api/settings", () => ({ fetchSettings: jest.fn() }));
jest.mock("../api/stats", () => ({ fetchSummary: jest.fn() }));
jest.mock("../api/challenges", () => ({ fetchCurrentChallenge: jest.fn() }));
jest.mock("../notifications/reminders", () => ({ syncReminders: jest.fn() }));
jest.mock("expo-router", () => {
  const React = require("react");
  return {
    useFocusEffect: (cb: () => void) => React.useEffect(cb, [cb]),
    router: { push: jest.fn() },
  };
});

const mockUseAuth = useAuth as jest.Mock;
const mockListSessions = listSessions as jest.Mock;
const mockFetchSettings = fetchSettings as jest.Mock;
const mockFetchSummary = fetchSummary as jest.Mock;
const mockFetchChallenge = fetchCurrentChallenge as jest.Mock;
const mockSyncReminders = syncReminders as jest.Mock;

function page(sessions: ReturnType<typeof session>[], total?: number) {
  return { sessions, total: total ?? sessions.length, limit: 50, offset: 0 };
}

const now = new Date();
const p = (n: number) => String(n).padStart(2, "0");
const iso = (daysAgo: number, hour: number) => {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo, hour);
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(hour)}:00:00`;
};

function session(id: number, subjectName: string, minutes: number, startedAt: string) {
  return {
    id, user_id: 1, subject_id: 1, subject_name: subjectName, subject_icon: "book-open",
    started_at: startedAt, ended_at: startedAt,
    duration_minutes: minutes, source: "timer" as const, note: null, created_at: "",
  };
}

describe("HomeScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ token: "tok", user: null });
    mockListSessions.mockResolvedValue(page([]));
    mockFetchSettings.mockResolvedValue({
      daily_goal_minutes: 120,
      weekly_goal_minutes: 840,
      reminder_enabled: false,
      reminder_time: "19:00",
      updated_at: "",
    });
    mockFetchSummary.mockResolvedValue({
      total_minutes: 0,
      week_minutes: 0,
      streak_days: 0,
      per_subject: [],
    });
    mockSyncReminders.mockResolvedValue(undefined);
    mockFetchChallenge.mockResolvedValue({
      challenge: {
        code: "weekly_420",
        name: "7-hour week",
        description: "Study 7 hours this week",
        target: 420,
        unit: "minutes",
      },
      value: 0,
      completed: false,
      days_left: 3,
    });
  });

  it("renders the week summary and today's goal from sessions", async () => {
    mockListSessions.mockResolvedValue(page([
      session(1, "math", 75, iso(0, 9)),
      session(2, "reading", 60, iso(0, 14)),
      session(3, "math", 30, iso(2, 10)),
    ]));

    const { getByText } = await render(<HomeScreen />);

    await waitFor(() => expect(getByText("2h 45m")).toBeTruthy());
    expect(getByText("THIS WEEK")).toBeTruthy();
    expect(getByText("Goal met 1/7 days")).toBeTruthy();
    expect(getByText(/2h 15m/)).toBeTruthy();
  });

  it("renders the timeline grouped by day with subject labels", async () => {
    mockListSessions.mockResolvedValue(page([
      session(1, "math", 90, iso(0, 9)),
      session(2, "other", 30, iso(1, 18)),
    ]));

    const { getByText, getByTestId } = await render(<HomeScreen />);

    await waitFor(() => expect(getByText("Today")).toBeTruthy());
    expect(getByText("Yesterday")).toBeTruthy();
    expect(getByText("Math")).toBeTruthy();
    expect(getByText("Other")).toBeTruthy();
    expect(getByText("1h 30m")).toBeTruthy();
    expect(getByText("30m")).toBeTruthy();
    expect(getByTestId("refresh-button")).toBeTruthy();
  });

  it("opens the session detail when a row is tapped", async () => {
    mockListSessions.mockResolvedValue(page([session(1, "math", 60, iso(0, 9))]));

    const { getByText } = await render(<HomeScreen />);
    await waitFor(() => expect(getByText("Math")).toBeTruthy());
    await fireEvent.press(getByText("Math"));
    expect(router.push).toHaveBeenCalledWith("/session/1");
  });

  it("uses the configured daily goal from settings", async () => {
    mockFetchSettings.mockResolvedValue({
      daily_goal_minutes: 60,
      weekly_goal_minutes: 840,
      reminder_enabled: false,
      reminder_time: "19:00",
      updated_at: "",
    });
    mockListSessions.mockResolvedValue(page([
      session(1, "math", 30, iso(0, 9)),
      session(2, "math", 30, iso(0, 14)),
      session(3, "math", 30, iso(1, 10)),
    ]));

    const { getByText } = await render(<HomeScreen />);

    await waitFor(() => expect(getByText("/ 1h 0m")).toBeTruthy());
    expect(getByText("Goal met 1/7 days")).toBeTruthy();
  });

  it("searches sessions and clears the search", async () => {
    mockListSessions.mockResolvedValue(page([session(1, "math", 60, iso(0, 9))]));

    const { getByTestId } = await render(<HomeScreen />);
    await waitFor(() => expect(getByTestId("search-input")).toBeTruthy());

    await fireEvent.changeText(getByTestId("search-input"), "algebra");
    await waitFor(() => {
      expect(mockListSessions).toHaveBeenCalledWith(
        "tok",
        expect.objectContaining({ q: "algebra", limit: 50, offset: 0 }),
      );
    });

    await fireEvent.press(getByTestId("clear-search-button"));
    await waitFor(() => {
      expect(mockListSessions).toHaveBeenLastCalledWith(
        "tok",
        expect.objectContaining({ q: undefined }),
      );
    });
  });

  it("loads more sessions when there are more pages", async () => {
    const first = page([session(1, "math", 60, iso(0, 9))], 2);
    mockListSessions.mockResolvedValueOnce(first);
    mockListSessions.mockResolvedValueOnce(page([session(2, "reading", 45, iso(1, 10))], 2));

    const { getByTestId, getByText } = await render(<HomeScreen />);
    await waitFor(() => expect(getByTestId("load-more-button")).toBeTruthy());

    await fireEvent.press(getByTestId("load-more-button"));
    await waitFor(() => expect(getByText("Reading")).toBeTruthy());
    expect(mockListSessions).toHaveBeenLastCalledWith(
      "tok",
      expect.objectContaining({ offset: 1 }),
    );
  });

  it("shows an empty state without sessions", async () => {
    const { getByText } = await render(<HomeScreen />);

    await waitFor(() => expect(getByText("No sessions yet")).toBeTruthy());
    expect(getByText(/Record tab/i)).toBeTruthy();
  });

  it("greets by display name when set", async () => {
    mockUseAuth.mockReturnValue({
      token: "tok",
      user: { id: 1, email: "rafif@example.com", name: "Rafif", created_at: "" },
    });

    const { getByText } = await render(<HomeScreen />);
    await waitFor(() => expect(getByText("Hi, Rafif")).toBeTruthy());
  });

  it("renders the weekly challenge banner with progress", async () => {
    mockFetchChallenge.mockResolvedValue({
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
    });

    const { getByTestId, getByText } = await render(<HomeScreen />);

    await waitFor(() => expect(getByTestId("challenge-card")).toBeTruthy());
    expect(getByText("7-hour week")).toBeTruthy();
    expect(getByText("3 days left")).toBeTruthy();
    expect(getByText("3h 30m of 7h 0m · 50%")).toBeTruthy();
  });

  it("shows a completed challenge", async () => {
    mockFetchChallenge.mockResolvedValue({
      challenge: {
        code: "weekly_5days",
        name: "Five-day rhythm",
        description: "Study on 5 different days this week",
        target: 5,
        unit: "days",
      },
      value: 5,
      completed: true,
      days_left: 1,
    });

    const { getByTestId, getByText } = await render(<HomeScreen />);

    await waitFor(() => expect(getByTestId("challenge-card")).toBeTruthy());
    expect(getByText("Challenge complete!")).toBeTruthy();
    expect(getByText("5 of 5 days · 100%")).toBeTruthy();
  });

  it("syncs reminders with the streak for streak protection", async () => {
    mockFetchSummary.mockResolvedValue({
      total_minutes: 0,
      week_minutes: 0,
      streak_days: 9,
      per_subject: [],
    });
    mockFetchSettings.mockResolvedValue({
      daily_goal_minutes: 120,
      weekly_goal_minutes: 840,
      reminder_enabled: true,
      reminder_time: "20:00",
      updated_at: "",
    });

    await render(<HomeScreen />);

    await waitFor(() => {
      expect(mockSyncReminders).toHaveBeenCalledWith(
        { enabled: true, time: "20:00" },
        9,
      );
    });
  });

  it("shows an error when sessions fail to load", async () => {
    mockListSessions.mockRejectedValue(new Error("boom"));

    const { getByText } = await render(<HomeScreen />);
    await waitFor(() => expect(getByText(/could not load sessions/i)).toBeTruthy());
  });

  it("refreshes when the refresh button is pressed", async () => {
    const { getByTestId } = await render(<HomeScreen />);

    await waitFor(() => expect(getByTestId("refresh-button")).toBeTruthy());
    await fireEvent.press(getByTestId("refresh-button"));

    expect(mockListSessions).toHaveBeenCalledTimes(2);
  });

  it("no longer hosts the logout button", async () => {
    const { queryByTestId } = await render(<HomeScreen />);
    await waitFor(() => expect(queryByTestId("refresh-button")).toBeTruthy());
    expect(queryByTestId("logout-button")).toBeNull();
  });
});
