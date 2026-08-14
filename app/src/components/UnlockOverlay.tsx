import React, { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet } from "react-native";
import { Achievement } from "../api/achievements";
import { achievementIcon } from "../constants/achievementIcons";
import { Icon } from "./ui/icon";
import { Text } from "./ui/text";
import { View } from "./ui/view";
import { useColor } from "../hooks/useColor";
import { withOpacity } from "../theme/colors";
import { appFonts } from "../theme/fonts";
import { fontSize, radius, spacing } from "../theme/tokens";

const DURATION_MS = 2600;

type UnlockOverlayProps = {
  achievements: Achievement[];
  onDone: () => void;
};

export function UnlockOverlay({ achievements, onDone }: UnlockOverlayProps) {
  const [scale] = useState(() => new Animated.Value(0.7));
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const primaryColor = useColor("primary");
  const accentColor = useColor("accent");
  const backgroundColor = useColor("background");
  const iconColor = useColor("icon");

  useEffect(() => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 5 }).start();
    timerRef.current = setTimeout(onDone, DURATION_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [scale, onDone]);

  const first = achievements[0];
  if (!first) return null;

  return (
    <View
      style={[styles.overlay, { backgroundColor: withOpacity(backgroundColor, 0.92) }]}
      pointerEvents="none"
      testID="unlock-overlay"
    >
      <Animated.View
        style={[styles.badge, { backgroundColor: accentColor, transform: [{ scale }] }]}
      >
        <Icon
          name={achievementIcon(first.code)}
          size={40}
          strokeWidth={2}
          color={primaryColor}
        />
      </Animated.View>
      <Text style={styles.title}>Achievement unlocked!</Text>
      <Text style={styles.name}>{first.name}</Text>
      <Text style={[styles.description, { color: iconColor }]}>{first.description}</Text>
      {achievements.length > 1 ? (
        <Text style={[styles.more, { color: iconColor }]}>+{achievements.length - 1} more</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  badge: {
    width: 96,
    height: 96,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  title: { fontSize: fontSize.heading, fontFamily: appFonts.extraBold },
  name: { fontSize: fontSize.title, fontFamily: appFonts.bold },
  description: { fontSize: fontSize.body, textAlign: "center" },
  more: { fontSize: fontSize.caption },
});
