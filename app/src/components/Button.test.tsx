import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import { Button } from "./Button";

describe("Button", () => {
  it("renders the title and fires onPress", async () => {
    const onPress = jest.fn();
    const { getByText } = await render(<Button title="Save" onPress={onPress} />);
    await fireEvent.press(getByText("Save"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("is disabled when disabled or loading", async () => {
    const onPress = jest.fn();
    const { getByTestId, rerender } = await render(
      <Button title="Save" onPress={onPress} disabled />,
    );
    await fireEvent.press(getByTestId("button"));
    expect(onPress).not.toHaveBeenCalled();

    await rerender(<Button title="Save" onPress={onPress} loading />);
    await fireEvent.press(getByTestId("button"));
    expect(onPress).not.toHaveBeenCalled();
  });

  it("shows a spinner while loading", async () => {
    const { getByTestId } = await render(
      <Button title="Save" onPress={jest.fn()} loading />,
    );
    expect(getByTestId("button-loading")).toBeTruthy();
  });
});
