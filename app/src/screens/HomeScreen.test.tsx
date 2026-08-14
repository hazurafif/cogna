import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";
import { HomeScreen } from "./HomeScreen";
import { useAuth } from "../auth/AuthContext";
import { listSessions } from "../api/sessions";

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
jest.mock("expo-router", () => {
  const React = require("react");
  return {
    useFocusEffect: (cb: () => void) => React.useEffect(cb, [cb]),
    router: { push: jest.fn() },
  };
});

const mockUseAuth = useAuth as jest.Mock;
const mockListSessions = listSessions as jest.Mock;

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
    mockListSessions.mockResolvedValue([]);
  });

  it("renders the week summary and today's goal from sessions", async () => {
    mockListSessions.mockResolvedValue([
      session(1, "math", 75, iso(0, 9)),
      session(2, "reading", 60, iso(0, 14)),
      session(3, "math", 30, iso(2, 10)),
    ]);

    const { getByText } = await render(<HomeScreen />);

    await waitFor(() => expect(getByText("2h 45m")).toBeTruthy());
    expect(getByText("THIS WEEK")).toBeTruthy();
    expect(getByText("Goal met 1/7 days")).toBeTruthy();
    expect(getByText(/2h 15m/)).toBeTruthy();
  });

  it("renders the timeline grouped by day with subject labels", async () => {
    mockListSessions.mockResolvedValue([
      session(1, "math", 90, iso(0, 9)),
      session(2, "other", 30, iso(1, 18)),
    ]);

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
    mockListSessions.mockResolvedValue([session(1, "math", 60, iso(0, 9))]);

    const { getByText } = await render(<HomeScreen />);
    await waitFor(() => expect(getByText("Math")).toBeTruthy());
    await fireEvent.press(getByText("Math"));
    expect(router.push).toHaveBeenCalledWith("/session/1");
  });

  it("shows an empty state without sessions", async () => {
    const { getByText } = await render(<HomeScreen />);

    await waitFor(() => expect(getByText("No sessions yet")).toBeTruthy());
    expect(getByText(/Record tab/i)).toBeTruthy();
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
