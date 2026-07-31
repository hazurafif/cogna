import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { SessionDetailScreen } from "./SessionDetailScreen";
import { useAuth } from "../auth/AuthContext";
import { deleteSession, getSession } from "../api/sessions";

jest.mock("../auth/AuthContext", () => ({ useAuth: jest.fn() }));
jest.mock("../api/sessions", () => ({
  getSession: jest.fn(),
  deleteSession: jest.fn(),
}));
jest.mock("expo-router", () => {
  const React = require("react");
  return {
    router: { back: jest.fn(), push: jest.fn() },
    useLocalSearchParams: jest.fn(() => ({ id: "2" })),
    useFocusEffect: (cb: () => void) => React.useEffect(cb, [cb]),
  };
});

const mockUseAuth = useAuth as jest.Mock;
const mockGetSession = getSession as jest.Mock;
const mockDeleteSession = deleteSession as jest.Mock;

describe("SessionDetailScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ token: "tok" });
  });

  it("loads and shows session details", async () => {
    mockGetSession.mockResolvedValue({
      id: 2, user_id: 1, subject_id: 1, subject_name: "History", subject_color: "#10B981",
      started_at: "2026-07-31T09:00:00", ended_at: "2026-07-31T10:00:00",
      duration_minutes: 60, source: "timer", note: "revision", created_at: "",
    });

    const { getByText } = await render(<SessionDetailScreen />);
    await waitFor(() => expect(getByText("History")).toBeTruthy());
    expect(getByText("revision")).toBeTruthy();
    expect(getByText("1h 0m")).toBeTruthy();
  });

  it("deletes the session", async () => {
    mockGetSession.mockResolvedValue({
      id: 2, user_id: 1, subject_id: 1, subject_name: "History", subject_color: "#10B981",
      started_at: "2026-07-31T09:00:00", ended_at: "2026-07-31T10:00:00",
      duration_minutes: 60, source: "timer", note: null, created_at: "",
    });
    mockDeleteSession.mockResolvedValue(undefined);

    const { getByText } = await render(<SessionDetailScreen />);
    await waitFor(() => expect(getByText("History")).toBeTruthy());

    await fireEvent.press(getByText("Delete"));
    await waitFor(() => expect(mockDeleteSession).toHaveBeenCalledWith("tok", 2));
  });

  it("navigates to edit on edit press", async () => {
    mockGetSession.mockResolvedValue({
      id: 2, user_id: 1, subject_id: 1, subject_name: "History", subject_color: "#10B981",
      started_at: "2026-07-31T09:00:00", ended_at: "2026-07-31T10:00:00",
      duration_minutes: 60, source: "timer", note: null, created_at: "",
    });

    const { getByText } = await render(<SessionDetailScreen />);
    await waitFor(() => expect(getByText("History")).toBeTruthy());

    await fireEvent.press(getByText("Edit"));
    expect(require("expo-router").router.push).toHaveBeenCalledWith("/session/2/edit");
  });

  it("shows an error when delete fails", async () => {
    mockGetSession.mockResolvedValue({
      id: 2, user_id: 1, subject_id: 1, subject_name: "History", subject_color: "#10B981",
      started_at: "2026-07-31T09:00:00", ended_at: "2026-07-31T10:00:00",
      duration_minutes: 60, source: "timer", note: null, created_at: "",
    });
    mockDeleteSession.mockRejectedValue(new Error("boom"));

    const { getByText } = await render(<SessionDetailScreen />);
    await waitFor(() => expect(getByText("History")).toBeTruthy());

    await fireEvent.press(getByText("Delete"));
    await waitFor(() => expect(getByText(/could not delete session/i)).toBeTruthy());
  });

  it("does not fire delete twice on double press", async () => {
    mockGetSession.mockResolvedValue({
      id: 2, user_id: 1, subject_id: 1, subject_name: "History", subject_color: "#10B981",
      started_at: "2026-07-31T09:00:00", ended_at: "2026-07-31T10:00:00",
      duration_minutes: 60, source: "timer", note: null, created_at: "",
    });
    let resolveDelete!: () => void;
    mockDeleteSession.mockReturnValue(
      new Promise<void>((resolve) => { resolveDelete = resolve; }),
    );

    const { getByText, getByTestId } = await render(<SessionDetailScreen />);
    await waitFor(() => expect(getByText("History")).toBeTruthy());

    const deleteButton = getByText("Delete");
    const firstPress = fireEvent.press(deleteButton);
    await waitFor(() => expect(mockDeleteSession).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(getByTestId("button-loading")).toBeTruthy());

    await fireEvent.press(getByTestId("button-loading"));
    expect(mockDeleteSession).toHaveBeenCalledTimes(1);

    resolveDelete();
    await firstPress;
    await waitFor(() => expect(require("expo-router").router.back).toHaveBeenCalled());
  });
});
