import React, { createElement } from "react";
import { View } from "react-native";
import { subjectIcon } from "../constants/subjectIcons";
import { colors } from "../theme/colors";

type SubjectIconProps = {
  name: string;
  size?: number;
  color?: string;
};

export function SubjectIcon({ name, size = 16, color = colors.primary }: SubjectIconProps) {
  return (
    <View testID="subject-icon">
      {createElement(subjectIcon(name), { size, strokeWidth: 2.5, color })}
    </View>
  );
}
