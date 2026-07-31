import React from "react";
import { Text } from "react-native";
import { render } from "@testing-library/react-native";
import { Card } from "./Card";

describe("Card", () => {
  it("renders children", async () => {
    const { getByText } = await render(<Card><Text>content</Text></Card>);
    expect(getByText("content")).toBeTruthy();
  });
});
