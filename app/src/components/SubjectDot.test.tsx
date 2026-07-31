import React from "react";
import { render } from "@testing-library/react-native";
import { SubjectDot } from "./SubjectDot";

describe("SubjectDot", () => {
  it("renders a colored dot", async () => {
    const { getByTestId } = await render(<SubjectDot color="#22C55E" />);
    const dot = getByTestId("subject-dot");
    expect(dot.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ backgroundColor: "#22C55E" })]),
    );
  });
});
