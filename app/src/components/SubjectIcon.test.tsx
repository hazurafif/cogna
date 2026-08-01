import React from "react";
import { render } from "@testing-library/react-native";
import { SubjectIcon } from "./SubjectIcon";

describe("SubjectIcon", () => {
  it("renders a known icon", async () => {
    const { getByTestId } = await render(<SubjectIcon name="book-open" />);
    expect(getByTestId("subject-icon")).toBeTruthy();
  });

  it("falls back to book-open for unknown names", async () => {
    const { getByTestId } = await render(<SubjectIcon name="nope-not-real" />);
    expect(getByTestId("subject-icon")).toBeTruthy();
  });

  it("renders every catalogued icon name", async () => {
    const { SUBJECT_ICONS } = require("../constants/subjectIcons");
    for (const name of SUBJECT_ICONS) {
      const { getByTestId } = await render(<SubjectIcon name={name} />);
      expect(getByTestId("subject-icon")).toBeTruthy();
    }
  });
});
