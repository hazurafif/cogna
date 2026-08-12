import React, { useCallback, useState } from "react";
import { SectionList, StyleSheet, Text, View } from "react-native";
import { RefreshCw, ChevronRight, History, Target } from "lucide-react-native";
import { router, useFocusEffect } from "expo-router";
import { Avatar, IconButton, List, ProgressBar } from "react-native-paper";
import { useAuth } from "../auth/AuthContext";
import { listSessions, StudySession } from "../api/sessions";
import { Card } from "../components/Card";
import { Screen } from "../components/Screen";
import { SubjectIcon } from "../components/SubjectIcon";
import { subjectLabel } from "../constants/subjectIcons";
import { colors } from "../theme/colors";
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
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      setSessions(await listSessions(token));
      setError(null);
    } catch {
      setError("Could not load sessions. Is the backend running?");
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

  const header = (
    <View style={styles.content}>
      <Card>
        <View style={styles.weekHeader}>
          <View>
            <Text style={styles.weekLabel}>THIS WEEK</Text>
            <Text style={styles.weekValue}>{formatDuration(week)}</Text>
          </View>
          <View style={styles.goalDaysBadge}>
            <Target size={14} strokeWidth={2.2} color={colors.primary} />
            <Text style={styles.goalDaysText}>Goal met {goalDays}/7 days</Text>
          </View>
        </View>
      </Card>

      <Card>
        <View style={styles.goalHeader}>
          <View style={styles.goalTitleWrap}>
            <Target size={16} strokeWidth={2.2} color={colors.primary} />
            <Text style={styles.goalTitle}>Today{"'"}s goal</Text>
          </View>
          <Text style={styles.goalValue}>
            {formatMinutes(today)} <Text style={styles.goalOf}>/ {formatDuration(DAILY_GOAL_MINUTES)}</Text>
          </Text>
        </View>
        <ProgressBar
          progress={goalPct / 100}
          color={colors.primary}
          style={styles.goalTrack}
        />
      </Card>
    </View>
  );

  return (
    <Screen>
      <View style={styles.topRow}>
        <View style={styles.profile}>
          <Avatar.Text
            size={42}
            label={user ? initialOf(user.email) : "?"}
            labelStyle={styles.avatarText}
            style={styles.avatar}
          />
          <View>
            <Text style={styles.greeting}>Hi, {user?.email ?? "there"}</Text>
            <Text style={styles.greetingSub}>Ready to get back at it?</Text>
          </View>
        </View>
        <IconButton
          icon={({ size, color }) => (
            <RefreshCw size={size} strokeWidth={2.2} color={color} />
          )}
          onPress={refresh}
          testID="refresh-button"
          iconColor={colors.textSecondary}
          style={styles.refreshBtn}
        />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <SectionList
        sections={sections}
        keyExtractor={(s) => String(s.id)}
        contentContainerStyle={styles.list}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={header}
        renderSectionHeader={({ section }) => (
          <Text style={styles.dayLabel}>{section.label}</Text>
        )}
        renderItem={({ item }) => (
          <List.Item
            title={subjectLabel(item.subject_name)}
            titleStyle={styles.rowName}
            description={`${formatTime(item.started_at)} · ${item.source}`}
            descriptionStyle={styles.rowMeta}
            left={() => (
              <View style={styles.iconChip}>
                <SubjectIcon name={item.subject_icon} size={16} />
              </View>
            )}
            right={() => (
              <View style={styles.rowRight}>
                <Text style={styles.rowDuration}>
                  {formatDuration(item.duration_minutes)}
                </Text>
                <ChevronRight size={16} strokeWidth={2.2} color={colors.textMuted} />
              </View>
            )}
            onPress={() => router.push(`/session/${item.id}`)}
            style={styles.row}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <History size={26} strokeWidth={2} color={colors.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>No sessions yet</Text>
            <Text style={styles.emptyBody}>
              Head to the Record tab to start your first study session.
            </Text>
          </View>
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
  avatar: { backgroundColor: colors.primary },
  avatarText: { fontSize: fontSize.title, fontWeight: "800" },
  greeting: { fontSize: fontSize.title, fontWeight: "700", color: colors.text },
  greetingSub: { fontSize: fontSize.caption, color: colors.textMuted, marginTop: 1 },
  refreshBtn: {
    width: 36,
    height: 36,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  weekHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  weekLabel: {
    fontSize: fontSize.caption,
    fontWeight: "800",
    color: colors.textMuted,
    letterSpacing: 1,
  },
  weekValue: {
    fontSize: fontSize.heading,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.5,
    marginTop: 2,
    fontVariant: ["tabular-nums"],
  },
  goalDaysBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  goalDaysText: { color: colors.primary, fontSize: fontSize.caption, fontWeight: "700" },
  goalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  goalTitleWrap: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  goalTitle: { fontSize: fontSize.body, fontWeight: "700", color: colors.text },
  goalValue: { fontSize: fontSize.title, fontWeight: "800", color: colors.text, fontVariant: ["tabular-nums"] },
  goalOf: { fontSize: fontSize.caption, fontWeight: "600", color: colors.textMuted },
  goalTrack: {
    height: 8,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    marginTop: spacing.md,
  },
  dayLabel: {
    fontSize: fontSize.caption,
    fontWeight: "800",
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  iconChip: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  row: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    marginBottom: spacing.sm,
  },
  rowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  rowName: { fontSize: fontSize.body, fontWeight: "700", color: colors.text },
  rowMeta: { fontSize: fontSize.caption, marginTop: 2, color: colors.textSecondary },
  rowDuration: {
    fontSize: fontSize.body,
    fontWeight: "800",
    color: colors.text,
    fontVariant: ["tabular-nums"],
  },
  error: { color: colors.danger, fontSize: fontSize.body },
  empty: { alignItems: "center", gap: spacing.sm, marginTop: spacing.xl * 2 },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: { fontSize: fontSize.title, fontWeight: "700", color: colors.text },
  emptyBody: { fontSize: fontSize.body, color: colors.textMuted, textAlign: "center" },
});
