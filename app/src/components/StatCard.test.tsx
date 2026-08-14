import React from "react";
import { render } from "@testing-library/react-native";
import { Clock, Flame } from "lucide-react-native";
import { StatCard } from "./StatCard";
import { Colors } from "../theme/colors";

describe("StatCard", () => {
  it("renders value and label", async () => {
    const { getByText } = await render(
      <StatCard icon={Clock} value="15h 20m" label="ALL TIME" />,
    );
    expect(getByText("15h 20m")).toBeTruthy();
    expect(getByText("ALL TIME")).toBeTruthy();
  });

  it("applies the highlighted style for the streak card", async () => {
    const { getByTestId } = await render(
      <StatCard icon={Flame} value="6 days" label="STREAK" highlighted />,
    );
    const card = getByTestId("stat-card");
    expect(card.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ backgroundColor: Colors.light.primary }),
      ]),
    );
  });
});
