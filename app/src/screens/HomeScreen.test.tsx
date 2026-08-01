import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { HomeScreen } from "./HomeScreen";
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
const todayISO = `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}T09:00:00`;

function session(minutes: number, startedAt: string = todayISO) {
  return {
    id: 1, user_id: 1, subject_id: 1, subject_name: "Math", subject_icon: "book-open",
    started_at: startedAt, ended_at: startedAt,
    duration_minutes: minutes, source: "timer", note: null, created_at: "",
  };
}

describe("HomeScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ token: "tok", user: null, logout: mockLogout });
    mockListSessions.mockResolvedValue([]);
  });

  it("renders stats from the summary", async () => {
    mockFetchSummary.mockResolvedValue({
      total_minutes: 150,
      week_minutes: 60,
      streak_days: 3,
      per_subject: [
        { subject_id: 1, name: "Math", icon: "book-open", minutes: 90 },
        { subject_id: 2, name: "History", icon: "flask-conical", minutes: 60 },
      ],
    });

    const { getByText } = await render(<HomeScreen />);

    await waitFor(() => expect(getByText("2h 30m")).toBeTruthy());
    expect(getByText("1h 0m")).toBeTruthy();
    expect(getByText(/3 day/i)).toBeTruthy();
    expect(getByText("Math")).toBeTruthy();
  });

  it("shows an error when stats fail to load", async () => {
    mockFetchSummary.mockRejectedValue(new Error("boom"));

    const { getByText } = await render(<HomeScreen />);
    await waitFor(() => expect(getByText(/could not load stats/i)).toBeTruthy());
  });

  it("logs out on button press", async () => {
    mockFetchSummary.mockResolvedValue({
      total_minutes: 0,
      week_minutes: 0,
      streak_days: 0,
      per_subject: [],
    });

    const { getByText } = await render(<HomeScreen />);

    await waitFor(() => expect(getByText("Log out")).toBeTruthy());
    await fireEvent.press(getByText("Log out"));

    expect(mockLogout).toHaveBeenCalled();
  });

  it("shows logout even when stats fail to load", async () => {
    mockFetchSummary.mockRejectedValue(new Error("boom"));

    const { getByTestId } = await render(<HomeScreen />);

    await waitFor(() => expect(getByTestId("logout-button")).toBeTruthy());
    await fireEvent.press(getByTestId("logout-button"));

    expect(mockLogout).toHaveBeenCalled();
  });

  it("refreshes stats when the refresh button is pressed", async () => {
    mockFetchSummary.mockResolvedValue({
      total_minutes: 0,
      week_minutes: 0,
      streak_days: 0,
      per_subject: [],
    });

    const { getByTestId } = await render(<HomeScreen />);

    await waitFor(() => expect(getByTestId("refresh-button")).toBeTruthy());
    await fireEvent.press(getByTestId("refresh-button"));

    expect(mockFetchSummary).toHaveBeenCalledTimes(2);
  });

  it("renders the weekly activity strip and today's goal", async () => {
    mockFetchSummary.mockResolvedValue({
      total_minutes: 150,
      week_minutes: 75,
      streak_days: 0,
      per_subject: [],
    });
    mockListSessions.mockResolvedValue([session(75)]);

    const { getByText, getAllByText } = await render(<HomeScreen />);

    await waitFor(() => expect(getByText("Last 7 days")).toBeTruthy());
    expect(getByText(/2h 0m/)).toBeTruthy();
    expect(getAllByText("1h 15m").length).toBeGreaterThan(0);
  });

  it("shows a milestone badge once the streak grows", async () => {
    mockFetchSummary.mockResolvedValue({
      total_minutes: 400,
      week_minutes: 100,
      streak_days: 7,
      per_subject: [],
    });

    const { getByText } = await render(<HomeScreen />);

    await waitFor(() => expect(getByText("7-day streak")).toBeTruthy());
    expect(getByText("Keep it alive today")).toBeTruthy();
  });

  it("is forgiving when a streak has broken", async () => {
    mockFetchSummary.mockResolvedValue({
      total_minutes: 30,
      week_minutes: 30,
      streak_days: 0,
      per_subject: [],
    });
    mockListSessions.mockResolvedValue([session(30)]);

    const { getByText } = await render(<HomeScreen />);

    await waitFor(() => expect(getByText("Every streak starts with one session")).toBeTruthy());
  });
});
