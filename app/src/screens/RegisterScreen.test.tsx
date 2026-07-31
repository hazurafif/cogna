import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";
import { RegisterScreen } from "./RegisterScreen";
import { useAuth } from "../auth/AuthContext";

jest.mock("../auth/AuthContext", () => ({
  useAuth: jest.fn(),
}));
jest.mock("expo-router", () => {
  const React = require("react");
  return {
    Link: ({ children }: { children: React.ReactNode }) =>
      React.createElement("Text", null, children),
    router: { replace: jest.fn() },
  };
});

const mockUseAuth = useAuth as jest.Mock;
const mockReplace = router.replace as jest.Mock;

describe("RegisterScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      register: jest.fn().mockResolvedValue(undefined),
      loading: false,
    });
  });

  it("submits email and password", async () => {
    const { getByPlaceholderText, getByText } = await render(<RegisterScreen />);

    await fireEvent.changeText(getByPlaceholderText("Email"), "  me@example.com  ");
    await fireEvent.changeText(getByPlaceholderText("Password (min 8 characters)"), "password123");
    await fireEvent.press(getByText("Register"));

    await waitFor(() => {
      expect(mockUseAuth().register).toHaveBeenCalledWith("me@example.com", "password123");
    });
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/(tabs)");
    });
  });

  it("shows an error when registration fails", async () => {
    mockUseAuth.mockReturnValue({
      register: jest.fn().mockRejectedValue(new Error("email_taken")),
      loading: false,
    });
    const { getByPlaceholderText, getByText } = await render(<RegisterScreen />);

    await fireEvent.changeText(getByPlaceholderText("Email"), "me@example.com");
    await fireEvent.changeText(getByPlaceholderText("Password (min 8 characters)"), "password123");
    await fireEvent.press(getByText("Register"));

    await waitFor(() => {
      expect(getByText(/could not register/i)).toBeTruthy();
    });
  });
});
