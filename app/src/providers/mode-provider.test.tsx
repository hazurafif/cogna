import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import * as ReactNative from "react-native";
import { Pressable, Text } from "react-native";
import { ModeProvider, useModeContext } from "./mode-provider";

function ModeProbe() {
  const context = useModeContext();
  return (
    <Text testID="mode">
      {context ? `${context.mode}:${context.scheme}` : "no-provider"}
    </Text>
  );
}

function ModeSetter() {
  const context = useModeContext();
  return (
    <Pressable testID="set-dark" onPress={() => context?.setMode("dark")}>
      <Text>set</Text>
    </Pressable>
  );
}

describe("mode-provider", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("defaults to system mode and resolves the scheme through the OS", async () => {
    jest.spyOn(ReactNative, "useColorScheme").mockReturnValue("dark");

    const { getByTestId } = await render(
      <ModeProvider>
        <ModeProbe />
      </ModeProvider>,
    );

    expect(getByTestId("mode").props.children).toBe("system:dark");
  });

  it("setMode flips the scheme regardless of the OS", async () => {
    jest.spyOn(ReactNative, "useColorScheme").mockReturnValue("light");

    const { getByTestId } = await render(
      <ModeProvider>
        <ModeProbe />
        <ModeSetter />
      </ModeProvider>,
    );

    expect(getByTestId("mode").props.children).toBe("system:light");

    await act(async () => {
      fireEvent.press(getByTestId("set-dark"));
    });

    expect(getByTestId("mode").props.children).toBe("dark:dark");
  });

  it("rehydrates a persisted mode from storage", async () => {
    const storage = {
      getItem: jest.fn().mockResolvedValue("light"),
      setItem: jest.fn(),
    };

    const { getByTestId } = await render(
      <ModeProvider storage={storage} storageKey="theme">
        <ModeProbe />
      </ModeProvider>,
    );

    await waitFor(() =>
      expect(getByTestId("mode").props.children).toBe("light:light"),
    );
    expect(storage.getItem).toHaveBeenCalledWith("theme");
  });

  it("persists setMode and survives an unreadable store", async () => {
    const storage = {
      getItem: jest.fn().mockRejectedValue(new Error("unreadable")),
      setItem: jest.fn(),
    };

    const { getByTestId } = await render(
      <ModeProvider storage={storage} storageKey="theme">
        <ModeProbe />
        <ModeSetter />
      </ModeProvider>,
    );

    // A broken store must not break boot — the default stays in place.
    await waitFor(() =>
      expect(getByTestId("mode").props.children).toBe("system:light"),
    );

    await act(async () => {
      fireEvent.press(getByTestId("set-dark"));
    });

    await waitFor(() => expect(storage.setItem).toHaveBeenCalledWith("theme", "dark"));
    expect(getByTestId("mode").props.children).toBe("dark:dark");
  });

  it("falls back to null without a provider", async () => {
    const { getByTestId } = await render(<ModeProbe />);
    expect(getByTestId("mode").props.children).toBe("no-provider");
  });

  it("renders children inside the provider", async () => {
    const { getByText } = await render(
      <ModeProvider><Text>child</Text></ModeProvider>,
    );
    expect(getByText("child")).toBeTruthy();
  });
});
