import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import * as ReactNative from "react-native";
import { Pressable, Text } from "react-native";
import { useColor } from "./useColor";
import { useColorScheme } from "./useColorScheme";
import { useHaptics } from "./useHaptics";
import { ModeProvider } from "../providers/mode-provider";
import * as Haptics from "expo-haptics";
import { Colors } from "../theme/colors";

function ColorProbe({ token, light, dark }: { token: string; light?: string; dark?: string }) {
  const value = useColor(token as keyof typeof Colors.light, { light, dark });
  return <Text testID="color">{String(value)}</Text>;
}

function SchemeProbe() {
  const scheme = useColorScheme();
  return <Text testID="scheme">{scheme}</Text>;
}

function HapticProbe({ enabled }: { enabled: boolean }) {
  const feedback = useHaptics(enabled);
  return (
    <Pressable testID="buzz" onPress={() => feedback("impact-light")}>
      <Text>buzz</Text>
    </Pressable>
  );
}

const wrapper = (mode: "light" | "dark" | "system" = "system") =>
  function Wrapper({ children }: { children: React.ReactNode }) {
    return <ModeProvider defaultMode={mode}>{children}</ModeProvider>;
  };

describe("theme hooks", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("useColor resolves tokens for the active scheme", async () => {
    jest.spyOn(ReactNative, "useColorScheme").mockReturnValue("dark");

    const { getByTestId } = await render(<ColorProbe token="primary" />, {
      wrapper: wrapper(),
    });
    expect(getByTestId("color").props.children).toBe(Colors.dark.primary);
  });

  it("useColor prefers light/dark prop overrides", async () => {
    jest.spyOn(ReactNative, "useColorScheme").mockReturnValue("light");

    const { getByTestId } = await render(
      <ColorProbe token="text" light="#010203" dark="#040506" />,
      { wrapper: wrapper() },
    );
    expect(getByTestId("color").props.children).toBe("#010203");
  });

  it("useColor falls back to the OS scheme without a provider", async () => {
    jest.spyOn(ReactNative, "useColorScheme").mockReturnValue("dark");

    const { getByTestId } = await render(<ColorProbe token="background" />);
    expect(getByTestId("color").props.children).toBe(Colors.dark.background);
  });

  it("useColorScheme collapses RN 0.86 unspecified into light", async () => {
    jest
      .spyOn(ReactNative, "useColorScheme")
      .mockReturnValue(undefined as unknown as ReturnType<typeof ReactNative.useColorScheme>);

    const { getByTestId } = await render(<SchemeProbe />, {
      wrapper: wrapper(),
    });
    expect(getByTestId("scheme").props.children).toBe("light");
  });

  it("useColorScheme follows the provider's explicit mode", async () => {
    jest.spyOn(ReactNative, "useColorScheme").mockReturnValue("light");

    const { getByTestId } = await render(<SchemeProbe />, {
      wrapper: wrapper("dark"),
    });
    expect(getByTestId("scheme").props.children).toBe("dark");

    jest.spyOn(ReactNative, "useColorScheme").mockReturnValue("dark");
    expect(getByTestId("scheme").props.children).toBe("dark");
  });

  it("useHaptics with enabled=false never touches expo-haptics", async () => {
    const impact = jest
      .spyOn(Haptics, "impactAsync")
      .mockImplementation(jest.fn());

    const { getByTestId } = await render(<HapticProbe enabled={false} />);
    fireEvent.press(getByTestId("buzz"));

    expect(impact).not.toHaveBeenCalled();
  });

  it("useHaptics with enabled=true fires and swallows module errors", async () => {
    const impact = jest
      .spyOn(Haptics, "impactAsync")
      .mockRejectedValue(new Error("unavailable"));

    const { getByTestId } = await render(<HapticProbe enabled />);
    fireEvent.press(getByTestId("buzz"));

    expect(impact).toHaveBeenCalled();
  });
});
