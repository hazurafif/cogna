import React, { useCallback, useState } from "react";
import { Pressable, SectionList, StyleSheet } from "react-native";
import { RefreshCw, ChevronRight, History, Target } from "lucide-react-native";
import { router, useFocusEffect } from "expo-router";
import { useAuth } from "../auth/AuthContext";
import { listSessions, StudySession } from "../api/sessions";
import { Card } from "../components/Card";
import { Screen } from "../components/Screen";
import { SubjectIcon } from "../components/SubjectIcon";
import { subjectLabel } from "../constants/subjectIcons";
import { Avatar, AvatarFallback } from "../components/ui/avatar";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { HelloWave } from "../components/ui/hello-wave";
import { Icon } from "../components/ui/icon";
import { ModeToggle } from "../components/ui/mode-toggle";
import { Progress } from "../components/ui/progress";
import { Skeleton } from "../components/ui/skeleton";
import { Text } from "../components/ui/text";
import { View } from "../components/ui/view";
import { useColor } from "../hooks/useColor";
import { appFonts } from "../theme/fonts";
import { fontSize, radius, spacing } from "../theme/tokens";
import { formatDuration, formatMinutes } from "../utils/time";
import {
  DAILY_GOAL_MINUTES,
  goalDaysThisWeek,
  groupSessionsByDay,
  todayMinutes,
  weekMinutes,
} from "../utils/daily";

function initialOf(email: string): string {
  return email.trim().charAt(0).toUpperCase() || "?";
}

function formatTime(startedAt: string): string {
  const [date, time] = startedAt.split("T");
  if (!time) return date.slice(5);
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${period}`;
}

export function HomeScreen() {
  const { token, user } = useAuth();
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const primaryColor = useColor("primary");
  const cardColor = useColor("card");
  const borderColor = useColor("border");
  const mutedColor = useColor("textMuted");
  const iconColor = useColor("icon");
  const dangerColor = useColor("error");

  const refresh = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      setSessions(await listSessions(token));
      setError(null);
    } catch {
      setError("Could not load sessions. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const sections = groupSessionsByDay(sessions);
  const week = weekMinutes(sessions);
  const goalDays = goalDaysThisWeek(sessions);
  const today = todayMinutes(sessions);
  const goalPct = Math.min(100, Math.round((today / DAILY_GOAL_MINUTES) * 100));

  const header = loading ? (
    <View style={styles.content}>
      <Skeleton height={110} variant="rounded" />
      <Skeleton height={110} variant="rounded" />
    </View>
  ) : (
    <View style={styles.content}>
      <Card>
        <View style={styles.weekHeader}>
          <View>
            <Text style={[styles.weekLabel, { color: mutedColor }]}>THIS WEEK</Text>
            <Text style={styles.weekValue}>{formatDuration(week)}</Text>
          </View>
          <Badge
            variant="secondary"
            textStyle={{ ...styles.goalDaysText, color: primaryColor }}
          >
            Goal met {goalDays}/7 days
          </Badge>
        </View>
      </Card>

      <Card>
        <View style={styles.goalHeader}>
          <View style={styles.goalTitleWrap}>
            <Icon name={Target} size={16} strokeWidth={2.2} color={primaryColor} />
            <Text style={styles.goalTitle}>Today{"'"}s goal</Text>
          </View>
          <Text style={styles.goalValue}>
            {formatMinutes(today)} <Text style={[styles.goalOf, { color: mutedColor }]}>/ {formatDuration(DAILY_GOAL_MINUTES)}</Text>
          </Text>
        </View>
        <Progress value={goalPct} height={8} style={styles.goalTrack} />
      </Card>
    </View>
  );

  return (
    <Screen>
      <View style={styles.topRow}>
        <View style={styles.profile}>
          <Avatar size={42}>
            <AvatarFallback
              style={{ backgroundColor: primaryColor }}
              textStyle={styles.avatarText}
            >
              {user ? initialOf(user.email) : "?"}
            </AvatarFallback>
          </Avatar>
          <View>
            <View style={styles.greetingRow}>
              <Text style={styles.greeting}>Hi, {user?.email ?? "there"}</Text>
              <HelloWave size="sm" />
            </View>
            <Text style={[styles.greetingSub, { color: mutedColor }]}>Ready to get back at it?</Text>
          </View>
        </View>
        <View style={styles.topActions}>
          <ModeToggle haptic={false} />
          <Button
            variant="secondary"
            size="icon"
            icon={RefreshCw}
            label="Refresh sessions"
            onPress={refresh}
            testID="refresh-button"
            haptic={false}
            style={[styles.refreshBtn, { borderColor }]}
            textStyle={{ color: iconColor }}
          />
        </View>
      </View>
      {error ? <Text style={[styles.error, { color: dangerColor }]}>{error}</Text> : null}
      <SectionList
        sections={sections}
        keyExtractor={(s) => String(s.id)}
        contentContainerStyle={styles.list}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={header}
        renderSectionHeader={({ section }) => (
          <Text style={[styles.dayLabel, { color: iconColor }]}>{section.label}</Text>
        )}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/session/${item.id}`)}
            style={({ pressed }) => [
              styles.row,
              { backgroundColor: cardColor, borderColor, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <View style={[styles.iconChip, { backgroundColor: mutedColor }]}>
              <SubjectIcon name={item.subject_icon} size={16} />
            </View>
            <View style={styles.rowBody}>
              <Text style={styles.rowName}>{subjectLabel(item.subject_name)}</Text>
              <Text style={[styles.rowMeta, { color: iconColor }]}>
                {formatTime(item.started_at)} · {item.source}
              </Text>
            </View>
            <View style={styles.rowRight}>
              <Text style={styles.rowDuration}>
                {formatDuration(item.duration_minutes)}
              </Text>
              <Icon name={ChevronRight} size={16} strokeWidth={2.2} color={mutedColor} />
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          loading ? null : (
            <View style={styles.empty}>
              <View style={[styles.emptyIcon, { backgroundColor: cardColor }]}>
                <Icon name={History} size={26} strokeWidth={2} color={mutedColor} />
              </View>
              <Text style={styles.emptyTitle}>No sessions yet</Text>
              <Text style={[styles.emptyBody, { color: mutedColor }]}>
                Head to the Record tab to start your first study session.
              </Text>
            </View>
          )
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg },
  list: { paddingBottom: spacing.xl },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  profile: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  avatarText: { fontSize: fontSize.title, fontFamily: appFonts.extraBold },
  greetingRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  greeting: { fontSize: fontSize.title, fontFamily: appFonts.bold },
  greetingSub: { fontSize: fontSize.caption, marginTop: 1 },
  topActions: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  refreshBtn: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  weekHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  weekLabel: {
    fontSize: fontSize.caption,
    fontFamily: appFonts.extraBold,
    letterSpacing: 1,
  },
  weekValue: {
    fontSize: fontSize.heading,
    fontFamily: appFonts.extraBold,
    letterSpacing: -0.5,
    marginTop: 2,
    fontVariant: ["tabular-nums"],
  },
  goalDaysText: { fontSize: fontSize.caption, fontFamily: appFonts.bold },
  goalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  goalTitleWrap: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  goalTitle: { fontSize: fontSize.body, fontFamily: appFonts.bold },
  goalValue: {
    fontSize: fontSize.title,
    fontFamily: appFonts.extraBold,
    fontVariant: ["tabular-nums"],
  },
  goalOf: { fontSize: fontSize.caption, fontFamily: appFonts.semibold },
  goalTrack: { marginTop: spacing.md },
  dayLabel: {
    fontSize: fontSize.caption,
    fontFamily: appFonts.extraBold,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  iconChip: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  rowBody: { flex: 1 },
  rowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  rowName: { fontSize: fontSize.body, fontFamily: appFonts.bold },
  rowMeta: { fontSize: fontSize.caption, marginTop: 2 },
  rowDuration: {
    fontSize: fontSize.body,
    fontFamily: appFonts.extraBold,
    fontVariant: ["tabular-nums"],
  },
  error: { fontSize: fontSize.body },
  empty: { alignItems: "center", gap: spacing.sm, marginTop: spacing.xl * 2 },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: { fontSize: fontSize.title, fontFamily: appFonts.bold },
  emptyBody: { fontSize: fontSize.body, textAlign: "center" },
});
