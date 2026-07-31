import React from "react";
import { render } from "@testing-library/react-native";
import { StatCard } from "./StatCard";

describe("StatCard", () => {
  it("renders value and label", async () => {
    const { getByText } = await render(
      <StatCard icon="time-outline" value="15h 20m" label="ALL TIME" />,
    );
    expect(getByText("15h 20m")).toBeTruthy();
    expect(getByText("ALL TIME")).toBeTruthy();
  });

  it("applies the highlighted style for the streak card", async () => {
    const { getByTestId } = await render(
      <StatCard icon="flame-outline" value="6 days" label="STREAK" highlighted />,
    );
    expect(getByTestId("stat-card")).toBeTruthy();
  });
});
