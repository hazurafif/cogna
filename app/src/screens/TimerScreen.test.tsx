import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { TimerScreen } from "./TimerScreen";
import { useAuth } from "../auth/AuthContext";
import { listSubjects } from "../api/subjects";
import { createSession } from "../api/sessions";
import { localISO } from "../utils/time";

jest.mock("../auth/AuthContext", () => ({ useAuth: jest.fn() }));
jest.mock("../api/subjects", () => ({ listSubjects: jest.fn() }));
jest.mock("../api/sessions", () => ({ createSession: jest.fn() }));
jest.mock("../utils/time", () => ({
  localISO: jest.fn(() => "2026-07-31T10:00:00"),
}));
jest.mock("expo-router", () => ({
  router: { push: jest.fn() },
}));

const mockUseAuth = useAuth as jest.Mock;
const mockListSubjects = listSubjects as jest.Mock;
const mockCreateSession = createSession as jest.Mock;

describe("TimerScreen", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ token: "tok" });
    mockListSubjects.mockResolvedValue([
      { id: 1, user_id: 1, name: "Math", color: "#4F46E5", created_at: "" },
    ]);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("starts, ticks, and stops a session", async () => {
    mockCreateSession.mockResolvedValue({ id: 9 });

    const { getByText, getByTestId } = await render(<TimerScreen />);
    await waitFor(() => expect(getByText("Math")).toBeTruthy());

    await fireEvent.press(getByText("Math"));
    await fireEvent.press(getByTestId("start-button"));

    expect(getByTestId("elapsed")).toBeTruthy();

    await act(async () => {
      jest.advanceTimersByTime(65_000);
    });
    expect(getByTestId("elapsed").props.children).toMatch(/01:0[05]/);

    await fireEvent.press(getByTestId("stop-button"));

    await waitFor(() => {
      expect(mockCreateSession).toHaveBeenCalledWith(
        "tok",
        expect.objectContaining({ subject_id: 1, source: "timer" }),
      );
    });
    expect(localISO).toHaveBeenCalled();
  });

  it("does not start without a subject", async () => {
    const { getByTestId } = await render(<TimerScreen />);
    await fireEvent.press(getByTestId("start-button"));
    expect(mockCreateSession).not.toHaveBeenCalled();
  });
});
