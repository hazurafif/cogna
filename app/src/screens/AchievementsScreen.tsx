import React, { useCallback, useState } from "react";
import { Pressable, StyleSheet } from "react-native";
import { ChevronLeft, Lock } from "lucide-react-native";
import { router, useFocusEffect } from "expo-router";
import { useAuth } from "../auth/AuthContext";
import { Achievement, fetchAchievements } from "../api/achievements";
import { Screen } from "../components/Screen";
import { achievementIcon } from "../constants/achievementIcons";
import { Badge } from "../components/ui/badge";
import { Icon } from "../components/ui/icon";
import { ScrollView } from "../components/ui/scroll-view";
import { Text } from "../components/ui/text";
import { View } from "../components/ui/view";
import { useColor } from "../hooks/useColor";
import { appFonts } from "../theme/fonts";
import { fontSize, radius, spacing } from "../theme/tokens";

export function AchievementsScreen() {
  const { token } = useAuth();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [error, setError] = useState<string | null>(null);

  const primaryColor = useColor("primary");
  const accentColor = useColor("accent");
  const cardColor = useColor("card");
  const borderColor = useColor("border");
  const textColor = useColor("text");
  const iconColor = useColor("icon");
  const mutedColor = useColor("textMuted");
  const dangerColor = useColor("error");
  const surfaceColor = useColor("secondary");

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetchAchievements(token);
      setAchievements(res.achievements);
      setError(null);
    } catch {
      setError("Could not load achievements.");
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const unlocked = achievements.filter((a) => a.unlocked).length;

  return (
    <Screen title="Achievements">
      <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backBtn} testID="back-button">
        <Icon name={ChevronLeft} size={20} strokeWidth={2.2} color={iconColor} />
        <Text style={[styles.backLabel, { color: iconColor }]}>Back</Text>
      </Pressable>
      {error ? <Text style={[styles.error, { color: dangerColor }]}>{error}</Text> : null}
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.summaryCard, { backgroundColor: cardColor, borderColor }]}>
          <Badge
            variant="default"
            textStyle={{ ...styles.summaryValue, color: textColor }}
            style={{ backgroundColor: accentColor, alignSelf: "flex-start" }}
          >
            {`${unlocked} of ${achievements.length} unlocked`}
          </Badge>
          <Text style={[styles.summaryHint, { color: mutedColor }]}>
            Badges never expire — keep studying to earn them all.
          </Text>
        </View>
        {achievements.map((a) => (
          <AchievementRow
            key={a.code}
            achievement={a}
            primaryColor={primaryColor}
            accentColor={accentColor}
            cardColor={cardColor}
            borderColor={borderColor}
            iconColor={iconColor}
            mutedColor={mutedColor}
            surfaceColor={surfaceColor}
            textColor={textColor}
          />
        ))}
      </ScrollView>
    </Screen>
  );
}

type AchievementRowProps = {
  achievement: Achievement;
  primaryColor: string;
  accentColor: string;
  cardColor: string;
  borderColor: string;
  iconColor: string;
  mutedColor: string;
  surfaceColor: string;
  textColor: string;
};

function AchievementRow({
  achievement,
  primaryColor,
  accentColor,
  cardColor,
  borderColor,
  iconColor,
  mutedColor,
  surfaceColor,
  textColor,
}: AchievementRowProps) {
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: cardColor, borderColor },
        !achievement.unlocked && styles.cardLocked,
      ]}
      testID={`achievement-${achievement.code}`}
    >
      <View
        style={[
          styles.iconChip,
          { backgroundColor: achievement.unlocked ? accentColor : surfaceColor },
        ]}
      >
        <Icon
          name={achievement.unlocked ? achievementIcon(achievement.code) : Lock}
          size={achievement.unlocked ? 22 : 18}
          strokeWidth={2.2}
          color={achievement.unlocked ? primaryColor : mutedColor}
        />
      </View>
      <View style={styles.body}>
        <Text
          style={[
            styles.name,
            { color: achievement.unlocked ? textColor : iconColor },
          ]}
        >
          {achievement.name}
        </Text>
        <Text style={[styles.description, { color: mutedColor }]}>
          {achievement.description}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backBtn: { flexDirection: "row", alignItems: "center", gap: spacing.xs, alignSelf: "flex-start" },
  backLabel: { fontSize: fontSize.body, fontFamily: appFonts.semibold },
  content: { gap: spacing.md, paddingBottom: spacing.xl },
  error: { fontSize: fontSize.body },
  summaryCard: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  summaryValue: { fontSize: fontSize.body, fontFamily: appFonts.bold },
  summaryHint: { fontSize: fontSize.caption },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  cardLocked: { opacity: 0.65 },
  iconChip: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  body: { flex: 1 },
  name: { fontSize: fontSize.body, fontFamily: appFonts.bold },
  description: { fontSize: fontSize.caption, marginTop: 2 },
});
