import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { LoginScreen } from "./LoginScreen";
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

describe("LoginScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      login: jest.fn().mockResolvedValue(undefined),
      loading: false,
    });
  });

  it("submits email and password", async () => {
    const { getByPlaceholderText, getByText } = await render(<LoginScreen />);

    await fireEvent.changeText(getByPlaceholderText("Email"), "me@example.com");
    await fireEvent.changeText(getByPlaceholderText("Password"), "password123");
    await fireEvent.press(getByText("Log in"));

    await waitFor(() => {
      expect(mockUseAuth().login).toHaveBeenCalledWith("me@example.com", "password123");
    });
  });

  it("shows an error when login fails", async () => {
    mockUseAuth.mockReturnValue({
      login: jest.fn().mockRejectedValue(new Error("invalid_credentials")),
      loading: false,
    });
    const { getByPlaceholderText, getByText } = await render(<LoginScreen />);

    await fireEvent.changeText(getByPlaceholderText("Email"), "me@example.com");
    await fireEvent.changeText(getByPlaceholderText("Password"), "wrong");
    await fireEvent.press(getByText("Log in"));

    await waitFor(() => {
      expect(getByText(/could not log in/i)).toBeTruthy();
    });
  });
});
