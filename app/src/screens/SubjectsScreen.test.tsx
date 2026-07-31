import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { SubjectsScreen } from "./SubjectsScreen";
import { useAuth } from "../auth/AuthContext";
import { createSubject, deleteSubject, listSubjects } from "../api/subjects";

jest.mock("../auth/AuthContext", () => ({ useAuth: jest.fn() }));
jest.mock("../api/subjects", () => ({
  listSubjects: jest.fn(),
  createSubject: jest.fn(),
  deleteSubject: jest.fn(),
}));
jest.mock("expo-router", () => ({
  useFocusEffect: (cb: () => void | (() => void)) => {
    const React = require("react");
    React.useEffect(cb, [cb]);
  },
}));

const mockUseAuth = useAuth as jest.Mock;
const mockList = listSubjects as jest.Mock;
const mockCreate = createSubject as jest.Mock;
const mockDelete = deleteSubject as jest.Mock;

describe("SubjectsScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ token: "tok" });
  });

  it("loads and renders subjects", async () => {
    mockList.mockResolvedValue([
      { id: 1, user_id: 1, name: "Math", color: "#4F46E5", created_at: "" },
      { id: 2, user_id: 1, name: "History", color: "#10B981", created_at: "" },
    ]);

    const { getByText } = await render(<SubjectsScreen />);
    await waitFor(() => expect(getByText("Math")).toBeTruthy());
    expect(getByText("History")).toBeTruthy();
  });

  it("creates a subject", async () => {
    mockList.mockResolvedValue([]);
    mockCreate.mockResolvedValue({
      id: 3, user_id: 1, name: "Physics", color: "#F59E0B", created_at: "",
    });

    const { getByPlaceholderText, getByText } = await render(<SubjectsScreen />);
    await fireEvent.changeText(getByPlaceholderText("Subject name"), "Physics");
    await fireEvent.press(getByText("Add"));

    await waitFor(() =>
      expect(mockCreate).toHaveBeenCalledWith("tok", "Physics", expect.any(String)),
    );
  });

  it("deletes a subject", async () => {
    mockList.mockResolvedValue([
      { id: 1, user_id: 1, name: "Math", color: "#4F46E5", created_at: "" },
    ]);
    mockDelete.mockResolvedValue(undefined);

    const { getByText } = await render(<SubjectsScreen />);
    await waitFor(() => expect(getByText("Math")).toBeTruthy());
    await fireEvent.press(getByText("Delete"));

    await waitFor(() => expect(mockDelete).toHaveBeenCalledWith("tok", 1));
  });
});
