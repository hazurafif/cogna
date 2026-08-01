import React, { useCallback, useState } from "react";
import { Pressable, SectionList, StyleSheet, Text, View } from "react-native";
import { RefreshCw, ChevronRight, History, Target } from "lucide-react-native";
import { router, useFocusEffect } from "expo-router";
import { useAuth } from "../auth/AuthContext";
import { listSessions, StudySession } from "../api/sessions";
import { Screen } from "../components/Screen";
import { SubjectIcon } from "../components/SubjectIcon";
import { subjectLabel } from "../constants/subjectIcons";
import { colors } from "../theme/colors";
import { fontSize, radius, shadow, spacing } from "../theme/tokens";
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
      <View style={styles.weekCard}>
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
      </View>

      <View style={styles.goalCard}>
        <View style={styles.goalHeader}>
          <View style={styles.goalTitleWrap}>
            <Target size={16} strokeWidth={2.2} color={colors.primary} />
            <Text style={styles.goalTitle}>Today{"'"}s goal</Text>
          </View>
          <Text style={styles.goalValue}>
            {formatMinutes(today)} <Text style={styles.goalOf}>/ {formatDuration(DAILY_GOAL_MINUTES)}</Text>
          </Text>
        </View>
        <View style={styles.goalTrack}>
          <View style={[styles.goalFill, { width: `${goalPct}%` }]} />
        </View>
      </View>
    </View>
  );

  return (
    <Screen>
      <View style={styles.topRow}>
        <View style={styles.profile}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user ? initialOf(user.email) : "?"}</Text>
          </View>
          <View>
            <Text style={styles.greeting}>Hi, {user?.email ?? "there"}</Text>
            <Text style={styles.greetingSub}>Ready to get back at it?</Text>
          </View>
        </View>
        <Pressable onPress={refresh} testID="refresh-button" hitSlop={8} style={styles.refreshBtn}>
          <RefreshCw size={18} strokeWidth={2.2} color={colors.textSecondary} />
        </Pressable>
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
          <Pressable
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            onPress={() => router.push(`/session/${item.id}`)}
          >
            <View style={styles.iconChip}>
              <SubjectIcon name={item.subject_icon} size={16} />
            </View>
            <View style={styles.rowBody}>
              <Text style={styles.rowName}>{subjectLabel(item.subject_name)}</Text>
              <Text style={styles.rowMeta}>
                {formatTime(item.started_at)} · {item.source}
              </Text>
            </View>
            <Text style={styles.rowDuration}>{formatDuration(item.duration_minutes)}</Text>
            <ChevronRight size={16} strokeWidth={2.2} color={colors.textMuted} />
          </Pressable>
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
  avatar: {
    width: 42,
    height: 42,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: colors.white, fontSize: fontSize.title, fontWeight: "800" },
  greeting: { fontSize: fontSize.title, fontWeight: "700", color: colors.text },
  greetingSub: { fontSize: fontSize.caption, color: colors.textMuted, marginTop: 1 },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  weekCard: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
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
  goalCard: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  goalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  goalTitleWrap: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  goalTitle: { fontSize: fontSize.body, fontWeight: "700", color: colors.text },
  goalValue: { fontSize: fontSize.title, fontWeight: "800", color: colors.text, fontVariant: ["tabular-nums"] },
  goalOf: { fontSize: fontSize.caption, fontWeight: "600", color: colors.textMuted },
  goalTrack: {
    height: 8,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    overflow: "hidden",
  },
  goalFill: { height: "100%", borderRadius: radius.full, backgroundColor: colors.primary },
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
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadow.card,
  },
  rowPressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
  rowBody: { flex: 1 },
  rowName: { fontSize: fontSize.body, fontWeight: "700", color: colors.text },
  rowMeta: { fontSize: fontSize.caption, color: colors.textSecondary, marginTop: 2 },
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
