import React from "react";
import { Text } from "react-native";
import { render } from "@testing-library/react-native";
import { Screen } from "./Screen";

describe("Screen", () => {
  it("renders children and an optional title", async () => {
    const { getByText } = await render(
      <Screen title="Subjects"><Text>body</Text></Screen>,
    );
    expect(getByText("Subjects")).toBeTruthy();
    expect(getByText("body")).toBeTruthy();
  });

  it("renders without a title", async () => {
    const { getByText } = await render(<Screen><Text>body</Text></Screen>);
    expect(getByText("body")).toBeTruthy();
  });
});
