import React from "react";
import { render } from "@testing-library/react-native";
import { SubjectDot } from "./SubjectDot";

describe("SubjectDot", () => {
  it("renders a colored dot", async () => {
    const { getByTestId } = await render(<SubjectDot color="#22C55E" />);
    const dot = getByTestId("subject-dot");
    expect(dot.props.style).toEqual({ backgroundColor: "#22C55E", width: 10, height: 10, borderRadius: 5 });
  });
});
