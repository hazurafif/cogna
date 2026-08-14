import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";
import { RecordScreen } from "./RecordScreen";
import { ToastProvider } from "../components/ui/toast";
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
  router: { push: jest.fn(), navigate: jest.fn() },
}));

const mockUseAuth = useAuth as jest.Mock;

const renderScreen = () =>
  render(<ToastProvider><RecordScreen /></ToastProvider>);
const mockListSubjects = listSubjects as jest.Mock;
const mockCreateSession = createSession as jest.Mock;

describe("RecordScreen", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ token: "tok" });
    mockListSubjects.mockResolvedValue([
      { id: 1, name: "math", icon: "calculator" },
      { id: 2, name: "other", icon: "brain" },
    ]);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("shows catalog subjects with display labels", async () => {
    const { getByText } = await renderScreen();
    await waitFor(() => expect(getByText("Math")).toBeTruthy());
    expect(getByText("Other")).toBeTruthy();
  });

  it("starts, ticks, and stops a session", async () => {
    mockCreateSession.mockResolvedValue({ id: 9 });

    const { getByText, getByTestId } = await renderScreen();
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
    const { getByTestId } = await renderScreen();
    await fireEvent.press(getByTestId("start-button"));
    expect(mockCreateSession).not.toHaveBeenCalled();
  });

  it("disables the start button while a run is in progress", async () => {
    const { getByText, getByTestId } = await renderScreen();
    await waitFor(() => expect(getByText("Math")).toBeTruthy());

    await fireEvent.press(getByText("Math"));
    await fireEvent.press(getByTestId("start-button"));

    expect(getByTestId("start-button").props.accessibilityState.disabled).toBe(true);
  });

  it("opens the manual log from the secondary action", async () => {
    const { getByTestId } = await renderScreen();
    await fireEvent.press(getByTestId("manual-button"));
    expect(router.push).toHaveBeenCalledWith("/session/new");
  });

  it("celebrates and navigates home after a successful save", async () => {
    mockCreateSession.mockResolvedValue({ id: 9 });

    const { getByText, getByTestId } = await renderScreen();
    await waitFor(() => expect(getByText("Math")).toBeTruthy());

    await fireEvent.press(getByText("Math"));
    await fireEvent.press(getByTestId("start-button"));
    await fireEvent.press(getByTestId("stop-button"));

    await waitFor(() => expect(getByText("Session saved!")).toBeTruthy());
    await act(async () => {
      jest.advanceTimersByTime(1500);
    });
    expect(router.navigate).toHaveBeenCalledWith("/");
  });

  it("keeps the run alive across re-renders (tab switches)", async () => {
    const { getByText, getByTestId, rerender } = await renderScreen();
    await waitFor(() => expect(getByText("Math")).toBeTruthy());

    await fireEvent.press(getByText("Math"));
    await fireEvent.press(getByTestId("start-button"));

    await act(async () => {
      jest.advanceTimersByTime(60_000);
    });
    const before = getByTestId("elapsed").props.children;

    await act(async () => {
      rerender(<ToastProvider><RecordScreen /></ToastProvider>);
    });
    await act(async () => {
      jest.advanceTimersByTime(30_000);
    });
    expect(getByTestId("elapsed").props.children).not.toBe(before);
  });

  it("keeps ticking and allows a retry after a failed save", async () => {
    mockCreateSession.mockRejectedValueOnce(new Error("boom"));
    mockCreateSession.mockResolvedValueOnce({ id: 9 });

    const { getByText, getByTestId } = await renderScreen();
    await waitFor(() => expect(getByText("Math")).toBeTruthy());

    await fireEvent.press(getByText("Math"));
    await fireEvent.press(getByTestId("start-button"));

    await act(async () => {
      jest.advanceTimersByTime(10_000);
    });
    const before = getByTestId("elapsed").props.children;

    await fireEvent.press(getByTestId("stop-button"));
    await waitFor(() => expect(getByText(/could not save/i)).toBeTruthy());
    expect(getByTestId("stop-button").props.accessibilityState.disabled).toBe(false);

    await act(async () => {
      jest.advanceTimersByTime(10_000);
    });
    const after = getByTestId("elapsed").props.children;
    expect(after).not.toBe(before);

    await fireEvent.press(getByTestId("stop-button"));
    await waitFor(() => expect(mockCreateSession).toHaveBeenCalledTimes(2));
  });
});
