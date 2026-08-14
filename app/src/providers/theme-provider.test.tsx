import React from "react";
import { render } from "@testing-library/react-native";
import { Text } from "react-native";
import { ThemeProvider } from "./theme-provider";

describe("theme-provider", () => {
  it("mounts the provider tree around its children", async () => {
    const { getByText } = await render(
      <ThemeProvider>
        <Text>themed child</Text>
      </ThemeProvider>,
    );
    expect(getByText("themed child")).toBeTruthy();
  });

  it("accepts mode persistence props", async () => {
    const storage = {
      getItem: jest.fn().mockResolvedValue(null),
      setItem: jest.fn(),
    };
    const { getByText } = await render(
      <ThemeProvider storage={storage} storageKey="theme" defaultMode="dark">
        <Text>themed child</Text>
      </ThemeProvider>,
    );
    expect(getByText("themed child")).toBeTruthy();
  });
});
