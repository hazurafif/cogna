import React from "react";
import { View } from "react-native";

type SubjectDotProps = {
  color: string;
  size?: number;
};

export function SubjectDot({ color, size = 10 }: SubjectDotProps) {
  return (
    <View
      testID="subject-dot"
      style={{ backgroundColor: color, width: size, height: size, borderRadius: size / 2 }}
    />
  );
}
