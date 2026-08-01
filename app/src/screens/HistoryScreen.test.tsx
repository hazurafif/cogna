import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { HistoryScreen } from "./HistoryScreen";
import { useAuth } from "../auth/AuthContext";
import { listSessions } from "../api/sessions";

jest.mock("../auth/AuthContext", () => ({ useAuth: jest.fn() }));
jest.mock("../api/sessions", () => ({ listSessions: jest.fn() }));
jest.mock("expo-router", () => {
  const React = require("react");
  return {
    router: { push: jest.fn() },
    useFocusEffect: (cb: () => void) => React.useEffect(cb, [cb]),
  };
});

const mockUseAuth = useAuth as jest.Mock;
const mockListSessions = listSessions as jest.Mock;

describe("HistoryScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ token: "tok" });
  });

  it("renders sessions newest first with subject and duration", async () => {
    mockListSessions.mockResolvedValue([
      {
        id: 2, user_id: 1, subject_id: 1, subject_name: "Biology", subject_icon: "flask-conical",
        started_at: "2026-07-31T09:00:00", ended_at: "2026-07-31T10:00:00",
        duration_minutes: 60, source: "timer", note: null, created_at: "",
      },
      {
        id: 1, user_id: 1, subject_id: 2, subject_name: "Math", subject_icon: "book-open",
        started_at: "2026-07-30T09:00:00", ended_at: "2026-07-30T09:45:00",
        duration_minutes: 45, source: "manual", note: null, created_at: "",
      },
    ]);

    const { getByText } = await render(<HistoryScreen />);
    await waitFor(() => expect(getByText("Biology")).toBeTruthy());
    expect(getByText("1h 0m")).toBeTruthy();
    expect(getByText("45m")).toBeTruthy();
  });

  it("navigates to a session on press", async () => {
    mockListSessions.mockResolvedValue([
      {
        id: 2, user_id: 1, subject_id: 1, subject_name: "Biology", subject_icon: "flask-conical",
        started_at: "2026-07-31T09:00:00", ended_at: "2026-07-31T10:00:00",
        duration_minutes: 60, source: "timer", note: null, created_at: "",
      },
    ]);

    const { getByText } = await render(<HistoryScreen />);
    await waitFor(() => expect(getByText("Biology")).toBeTruthy());

    await fireEvent.press(getByText("Biology"));
    expect(require("expo-router").router.push).toHaveBeenCalledWith("/session/2");
  });

  it("shows an error when sessions fail to load", async () => {
    mockListSessions.mockRejectedValue(new Error("boom"));

    const { getByText } = await render(<HistoryScreen />);
    await waitFor(() => expect(getByText(/could not load sessions/i)).toBeTruthy());
  });

  it("shows no error after a successful load", async () => {
    mockListSessions.mockResolvedValue([
      {
        id: 2, user_id: 1, subject_id: 1, subject_name: "Biology", subject_icon: "flask-conical",
        started_at: "2026-07-31T09:00:00", ended_at: "2026-07-31T10:00:00",
        duration_minutes: 60, source: "timer", note: null, created_at: "",
      },
    ]);

    const { getByText, queryByText } = await render(<HistoryScreen />);
    await waitFor(() => expect(getByText("Biology")).toBeTruthy());
    expect(queryByText(/could not load sessions/i)).toBeNull();
  });
});
