import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { HomeScreen } from "./HomeScreen";
import { useAuth } from "../auth/AuthContext";
import { fetchSummary } from "../api/stats";

jest.mock("../auth/AuthContext", () => ({ useAuth: jest.fn() }));
jest.mock("../api/stats", () => ({ fetchSummary: jest.fn() }));
jest.mock("expo-router", () => {
  const React = require("react");
  return { useFocusEffect: (cb: () => void) => React.useEffect(cb, [cb]) };
});

const mockUseAuth = useAuth as jest.Mock;
const mockFetchSummary = fetchSummary as jest.Mock;
const mockLogout = jest.fn();

describe("HomeScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ token: "tok", user: null, logout: mockLogout });
  });

  it("renders stats from the summary", async () => {
    mockFetchSummary.mockResolvedValue({
      total_minutes: 150,
      week_minutes: 60,
      streak_days: 3,
      per_subject: [
        { subject_id: 1, name: "Math", color: "#4F46E5", minutes: 90 },
        { subject_id: 2, name: "History", color: "#10B981", minutes: 60 },
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
});
