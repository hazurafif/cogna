import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { SettingsScreen } from "./SettingsScreen";
import { useAuth } from "../auth/AuthContext";
import { fetchSettings, updateSettings } from "../api/settings";

jest.mock("../auth/AuthContext", () => ({ useAuth: jest.fn() }));
jest.mock("../api/settings", () => ({
  fetchSettings: jest.fn(),
  updateSettings: jest.fn(),
  DEFAULT_SETTINGS: {
    daily_goal_minutes: 120,
    weekly_goal_minutes: 840,
    reminder_enabled: false,
    reminder_time: "19:00",
    updated_at: "",
  },
}));
const mockUpdateName = jest.fn();
const mockBack = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ back: mockBack }),
  router: { back: mockBack },
}));

const mockUseAuth = useAuth as jest.Mock;
const mockFetchSettings = fetchSettings as jest.Mock;
const mockUpdateSettings = updateSettings as jest.Mock;

const user = { id: 1, email: "rafif@example.com", name: "", created_at: "2026-07-01T10:00:00" };

describe("SettingsScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ token: "tok", user, updateName: mockUpdateName });
    mockFetchSettings.mockResolvedValue({
      daily_goal_minutes: 120,
      weekly_goal_minutes: 840,
      reminder_enabled: false,
      reminder_time: "19:00",
      updated_at: "2026-07-31T10:00:00",
    });
    mockUpdateSettings.mockResolvedValue({});
  });

  it("loads and shows the saved goals", async () => {
    const { getByTestId } = await render(<SettingsScreen />);

    await waitFor(() => expect(getByTestId("daily-goal-value").props.children).toBe(120));
    expect(getByTestId("weekly-goal-value").props.children).toBe(840);
    expect(getByTestId("name-input").props.value).toBe("");
  });

  it("steps goals within bounds and saves", async () => {
    const { getByTestId } = await render(<SettingsScreen />);
    await waitFor(() => expect(getByTestId("daily-goal-value")).toBeTruthy());

    await fireEvent.press(getByTestId("daily-goal-plus"));
    await fireEvent.press(getByTestId("daily-goal-plus"));
    expect(getByTestId("daily-goal-value").props.children).toBe(150);

    await fireEvent.press(getByTestId("weekly-goal-minus"));
    expect(getByTestId("weekly-goal-value").props.children).toBe(780);

    await fireEvent.changeText(getByTestId("name-input"), "  Rafif  ");
    await fireEvent.press(getByTestId("save-settings-button"));

    await waitFor(() => {
      expect(mockUpdateSettings).toHaveBeenCalledWith("tok", {
        daily_goal_minutes: 150,
        weekly_goal_minutes: 780,
        reminder_enabled: false,
        reminder_time: "19:00",
      });
    });
    expect(mockUpdateName).toHaveBeenCalledWith("Rafif");
    expect(mockBack).toHaveBeenCalled();
  });

  it("does not update the name when unchanged", async () => {
    const { getByTestId } = await render(<SettingsScreen />);
    await waitFor(() => expect(getByTestId("daily-goal-value")).toBeTruthy());

    await fireEvent.press(getByTestId("save-settings-button"));

    await waitFor(() => expect(mockUpdateSettings).toHaveBeenCalled());
    expect(mockUpdateName).not.toHaveBeenCalled();
  });

  it("shows an error when saving fails", async () => {
    mockUpdateSettings.mockRejectedValue(new Error("boom"));

    const { getByTestId, getByText } = await render(<SettingsScreen />);
    await waitFor(() => expect(getByTestId("daily-goal-value")).toBeTruthy());

    await fireEvent.press(getByTestId("save-settings-button"));
    await waitFor(() => expect(getByText(/could not save settings/i)).toBeTruthy());
    expect(mockBack).not.toHaveBeenCalled();
  });

  it("toggles the reminder and picks a time chip", async () => {
    const { getByTestId } = await render(<SettingsScreen />);
    await waitFor(() => expect(getByTestId("reminder-switch")).toBeTruthy());

    await fireEvent(getByTestId("reminder-switch"), "valueChange", true);
    await fireEvent.press(getByTestId("reminder-time-20:00"));
    await fireEvent.press(getByTestId("save-settings-button"));

    await waitFor(() => {
      expect(mockUpdateSettings).toHaveBeenCalledWith("tok",
        expect.objectContaining({
          reminder_enabled: true,
          reminder_time: "20:00",
        }),
      );
    });
  });

  it("clamps at the minimum daily goal", async () => {
    const { getByTestId } = await render(<SettingsScreen />);
    await waitFor(() => expect(getByTestId("daily-goal-value")).toBeTruthy());

    for (let i = 0; i < 20; i++) {
      await fireEvent.press(getByTestId("daily-goal-minus"));
    }
    expect(getByTestId("daily-goal-value").props.children).toBe(15);
    expect(getByTestId("daily-goal-minus").props.accessibilityState.disabled).toBe(true);
  });
});
