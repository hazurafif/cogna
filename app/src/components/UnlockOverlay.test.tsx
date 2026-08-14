import React from "react";
import { act, render } from "@testing-library/react-native";
import { UnlockOverlay } from "./UnlockOverlay";

describe("UnlockOverlay", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const achievement = {
    code: "first_session",
    name: "First session",
    description: "Log your very first study session",
    icon: "zap",
    unlocked: true,
    unlocked_at: "2026-07-31T10:00:00",
  };

  it("shows the unlocked achievement name", async () => {
    const { getByText } = await render(
      <UnlockOverlay achievements={[achievement]} onDone={() => {}} />,
    );
    expect(getByText("Achievement unlocked!")).toBeTruthy();
    expect(getByText("First session")).toBeTruthy();
  });

  it("shows a count for additional unlocks", async () => {
    const second = { ...achievement, code: "streak_3", name: "On a roll" };
    const { getByText } = await render(
      <UnlockOverlay achievements={[achievement, second]} onDone={() => {}} />,
    );
    expect(getByText("+1 more")).toBeTruthy();
  });

  it("fires onDone after the display duration", async () => {
    const onDone = jest.fn();
    await render(<UnlockOverlay achievements={[achievement]} onDone={onDone} />);

    await act(async () => {
      jest.advanceTimersByTime(3000);
    });
    expect(onDone).toHaveBeenCalled();
  });

  it("renders nothing without achievements", async () => {
    const { queryByTestId } = await render(
      <UnlockOverlay achievements={[]} onDone={() => {}} />,
    );
    expect(queryByTestId("unlock-overlay")).toBeNull();
  });
});
