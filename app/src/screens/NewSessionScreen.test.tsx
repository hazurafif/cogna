import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { NewSessionScreen } from "./NewSessionScreen";
import { useAuth } from "../auth/AuthContext";
import { listSubjects } from "../api/subjects";
import { createSession, getSession, updateSession } from "../api/sessions";

jest.mock("../auth/AuthContext", () => ({ useAuth: jest.fn() }));
jest.mock("../api/subjects", () => ({ listSubjects: jest.fn() }));
jest.mock("../api/sessions", () => ({
  createSession: jest.fn(),
  getSession: jest.fn(),
  updateSession: jest.fn(),
}));
jest.mock("expo-router", () => ({
  router: { back: jest.fn() },
  useLocalSearchParams: jest.fn(() => ({})),
}));

const mockUseAuth = useAuth as jest.Mock;
const mockListSubjects = listSubjects as jest.Mock;
const mockCreateSession = createSession as jest.Mock;
const mockGetSession = getSession as jest.Mock;
const mockUpdateSession = updateSession as jest.Mock;
const mockUseLocalSearchParams = require("expo-router").useLocalSearchParams as jest.Mock;

describe("NewSessionScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ token: "tok" });
    mockListSubjects.mockResolvedValue([
      { id: 1, user_id: 1, name: "Math", color: "#4F46E5", created_at: "" },
    ]);
  });

  it("creates a manual session with date and minutes", async () => {
    mockCreateSession.mockResolvedValue({ id: 5 });

    const { getByPlaceholderText, getByText } = await render(<NewSessionScreen />);
    await waitFor(() => expect(getByText("Math")).toBeTruthy());

    await fireEvent.press(getByText("Math"));
    await fireEvent.changeText(getByPlaceholderText("Date (YYYY-MM-DD)"), "2026-07-31");
    await fireEvent.changeText(getByPlaceholderText("Minutes"), "45");
    await fireEvent.press(getByText("Save session"));

    await waitFor(() => {
      expect(mockCreateSession).toHaveBeenCalledWith(
        "tok",
        expect.objectContaining({
          subject_id: 1,
          source: "manual",
          ended_at: "2026-07-31T00:45:00",
        }),
      );
    });
  });

  it("shows a validation error for a bad date", async () => {
    const { getByPlaceholderText, getByText } = await render(<NewSessionScreen />);
    await waitFor(() => expect(getByText("Math")).toBeTruthy());

    await fireEvent.press(getByText("Math"));
    await fireEvent.changeText(getByPlaceholderText("Date (YYYY-MM-DD)"), "31-07-2026");
    await fireEvent.press(getByText("Save session"));

    await waitFor(() => expect(getByText(/valid date/i)).toBeTruthy());
  });

  it("prefills and updates an existing session in edit mode", async () => {
    mockUseLocalSearchParams.mockReturnValue({ id: "5" });
    mockGetSession.mockResolvedValue({
      id: 5, user_id: 1, subject_id: 1, subject_name: "Math", subject_color: "#4F46E5",
      started_at: "2026-07-30T09:00:00", ended_at: "2026-07-30T09:45:00",
      duration_minutes: 45, source: "manual", note: "revision", created_at: "",
    });
    mockUpdateSession.mockResolvedValue({ id: 5 });

    const { getByDisplayValue, getByText } = await render(<NewSessionScreen />);
    await waitFor(() => expect(getByDisplayValue("2026-07-30")).toBeTruthy());
    expect(getByDisplayValue("45")).toBeTruthy();
    expect(getByDisplayValue("revision")).toBeTruthy();
    expect(getByText("Edit session")).toBeTruthy();

    await fireEvent.press(getByText("Save session"));

    await waitFor(() => {
      expect(mockUpdateSession).toHaveBeenCalledWith(
        "tok",
        5,
        expect.objectContaining({
          source: "manual",
          subject_id: 1,
          started_at: "2026-07-30T00:00:00",
          note: "revision",
        }),
      );
    });
    expect(mockCreateSession).not.toHaveBeenCalled();
  });
});
