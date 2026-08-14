import React from "react";
import { View } from "react-native";
import { subjectIcon } from "../constants/subjectIcons";
import { Icon } from "./ui/icon";
import { useColor } from "../hooks/useColor";

type SubjectIconProps = {
  name: string;
  size?: number;
  color?: string;
};

export function SubjectIcon({ name, size = 16, color }: SubjectIconProps) {
  const primaryColor = useColor("primary");
  const resolved = color ?? primaryColor;

  return (
    <View testID="subject-icon">
      <Icon name={subjectIcon(name)} size={size} strokeWidth={2.5} color={resolved} />
    </View>
  );
}
