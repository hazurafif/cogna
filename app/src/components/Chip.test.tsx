import React from "react";
import { StyleSheet } from "react-native";
import { fireEvent, render } from "@testing-library/react-native";
import { Chip } from "./Chip";

describe("Chip", () => {
  it("renders the label and calls onPress", async () => {
    const onPress = jest.fn();
    const { getByText } = await render(<Chip label="Math" onPress={onPress} />);
    await fireEvent.press(getByText("Math"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("applies selected state", async () => {
    const { getByText } = await render(<Chip label="Math" selected />);
    const text = getByText("Math");
    expect(StyleSheet.flatten(text.props.style).color).toBe("#FFFFFF");
  });
});
