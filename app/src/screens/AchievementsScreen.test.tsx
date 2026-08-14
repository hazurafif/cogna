import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";
import { AchievementsScreen } from "./AchievementsScreen";
import { useAuth } from "../auth/AuthContext";
import { fetchAchievements, Achievement } from "../api/achievements";

jest.mock("../auth/AuthContext", () => ({ useAuth: jest.fn() }));
jest.mock("../api/achievements", () => ({ fetchAchievements: jest.fn() }));

const mockBack = jest.fn();

jest.mock("expo-router", () => {
  const React = require("react");
  return {
    useFocusEffect: (cb: () => void) => React.useEffect(cb, [cb]),
    useRouter: () => ({ back: mockBack }),
    router: { back: (...args: unknown[]) => mockBack(...args) },
  };
});

const mockUseAuth = useAuth as jest.Mock;
const mockFetchAchievements = fetchAchievements as jest.Mock;

function achievement(code: string, name: string, unlocked: boolean): Achievement {
  return {
    code,
    name,
    description: `${name} description`,
    icon: "zap",
    unlocked,
    unlocked_at: unlocked ? "2026-07-31T10:00:00" : null,
  };
}

const catalog = [
  achievement("first_session", "First session", true),
  achievement("streak_3", "On a roll", true),
  achievement("streak_7", "Week warrior", false),
  achievement("total_10h", "Double digits", false),
];

describe("AchievementsScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ token: "tok" });
    mockFetchAchievements.mockResolvedValue({ achievements: catalog });
  });

  it("shows the unlock summary and all badges", async () => {
    const { getByText } = await render(<AchievementsScreen />);

    await waitFor(() => expect(getByText("2 of 4 unlocked")).toBeTruthy());
    expect(getByText("First session")).toBeTruthy();
    expect(getByText("Week warrior")).toBeTruthy();
  });

  it("marks locked badges with a lock icon", async () => {
    const { getByTestId, getAllByTestId } = await render(<AchievementsScreen />);

    await waitFor(() => expect(getByTestId("achievement-total_10h")).toBeTruthy());
    const lockedIcon = getAllByTestId(/^achievement-.*/).filter(
      () => true,
    );
    expect(lockedIcon.length).toBe(4);
  });

  it("navigates back", async () => {
    const { getByTestId } = await render(<AchievementsScreen />);
    await waitFor(() => expect(getByTestId("back-button")).toBeTruthy());
    await fireEvent.press(getByTestId("back-button"));
    expect(mockBack).toHaveBeenCalled();
  });

  it("shows an error when loading fails", async () => {
    mockFetchAchievements.mockRejectedValue(new Error("boom"));

    const { getByText } = await render(<AchievementsScreen />);
    await waitFor(() => expect(getByText(/could not load achievements/i)).toBeTruthy());
  });
});
