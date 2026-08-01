import React, { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { RefreshCw, Clock, CalendarDays, Flame, LogOut, Target } from "lucide-react-native";
import { useFocusEffect } from "expo-router";
import { useAuth } from "../auth/AuthContext";
import { fetchSummary, Summary } from "../api/stats";
import { listSessions, StudySession } from "../api/sessions";
import { Button } from "../components/Button";
import { Screen } from "../components/Screen";
import { StatCard } from "../components/StatCard";
import { SubjectIcon } from "../components/SubjectIcon";
import { colors } from "../theme/colors";
import { fontSize, radius, spacing } from "../theme/tokens";
import { formatDuration, formatMinutes } from "../utils/time";
import {
  buildActivityWeek,
  DAILY_GOAL_MINUTES,
  streakCopy,
  streakMilestone,
  todayMinutes,
} from "../utils/daily";

function initialOf(email: string): string {
  return email.trim().charAt(0).toUpperCase() || "?";
}

export function HomeScreen() {
  const { token, user, logout } = useAuth();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      setSummary(await fetchSummary(token));
      setError(null);
    } catch {
      setError("Could not load stats. Is the backend running?");
    }
    try {
      setSessions(await listSessions(token));
    } catch {
      setSessions([]);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const week = buildActivityWeek(sessions);
  const maxDayMinutes = Math.max(...week.map((d) => d.minutes), 1);
  const today = todayMinutes(sessions);
  const goalPct = Math.min(100, Math.round((today / DAILY_GOAL_MINUTES) * 100));
  const milestone = summary ? streakMilestone(summary.streak_days) : null;
  const streakNote = summary ? streakCopy(summary.streak_days, sessions.length > 0) : null;

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
      {summary ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <View style={styles.cardRow}>
            <StatCard icon={Clock} value={formatDuration(summary.total_minutes)} label="ALL TIME" />
            <StatCard icon={CalendarDays} value={formatDuration(summary.week_minutes)} label="THIS WEEK" />
            <StatCard icon={Flame} value={`${summary.streak_days} days`} label="STREAK" highlighted />
          </View>

          <View style={styles.streakRow}>
            <Flame size={14} strokeWidth={2.2} color={colors.primary} />
            <Text style={styles.streakNote}>{streakNote}</Text>
            {milestone ? <Text style={styles.milestoneBadge}>{milestone}</Text> : null}
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

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Last 7 days</Text>
            <Text style={styles.sectionHint}>{formatMinutes(today)} today</Text>
          </View>
          <View style={styles.weekRow}>
            {week.map((d) => (
              <View key={d.date} style={styles.weekDay}>
                <Text style={[styles.weekday, d.isToday && styles.weekdayToday]}>{d.weekday}</Text>
                <View style={styles.weekBarTrack}>
                  <View
                    style={[
                      styles.weekBarFill,
                      {
                        backgroundColor: d.isToday ? colors.primary : colors.textSecondary,
                        height: `${Math.max(12, (d.minutes / maxDayMinutes) * 100)}%`,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.weekMinutes, d.isToday && styles.weekMinutesToday]}>
                  {d.minutes > 0 ? formatMinutes(d.minutes) : "–"}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>By subject</Text>
            <Text style={styles.sectionHint}>{summary.per_subject.length} tracked</Text>
          </View>
          {summary.per_subject.map((s) => (
            <View key={s.subject_id} style={styles.subjectRow}>
              <SubjectIcon name={s.icon} size={14} />
              <Text style={styles.subjectName}>{s.name}</Text>
              <View style={styles.subjectBarTrack}>
                <View
                  style={[
                    styles.subjectBarFill,
                    {
                      backgroundColor: colors.primary,
                      width: `${Math.max(4, (s.minutes / Math.max(summary.total_minutes, 1)) * 100)}%`,
                    },
                  ]}
                />
              </View>
              <Text style={styles.subjectMinutes}>{formatMinutes(s.minutes)}</Text>
            </View>
          ))}
        </ScrollView>
      ) : null}
      <View style={styles.logoutRow}>
        <LogOut size={16} strokeWidth={2.2} color={colors.textSecondary} />
        <Button title="Log out" variant="outline" onPress={() => logout()} testID="logout-button" />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg, paddingBottom: spacing.xl },
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
  cardRow: { flexDirection: "row", gap: spacing.sm },
  streakRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  streakNote: { flex: 1, fontSize: fontSize.caption, color: colors.textSecondary },
  milestoneBadge: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    color: colors.primary,
    fontSize: fontSize.caption,
    fontWeight: "700",
    overflow: "hidden",
  },
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
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginTop: spacing.xs,
  },
  sectionTitle: { fontSize: fontSize.title, fontWeight: "700", color: colors.text, letterSpacing: -0.3 },
  sectionHint: { fontSize: fontSize.caption, color: colors.textMuted },
  weekRow: { flexDirection: "row", gap: spacing.sm },
  weekDay: { flex: 1, alignItems: "center", gap: spacing.sm },
  weekday: { fontSize: fontSize.label, fontWeight: "600", color: colors.textMuted },
  weekdayToday: { color: colors.primary },
  weekBarTrack: {
    height: 64,
    width: "100%",
    justifyContent: "flex-end",
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.sm,
    padding: 2,
  },
  weekBarFill: { width: "100%", borderRadius: radius.sm },
  weekMinutes: { fontSize: fontSize.label, color: colors.textMuted, fontVariant: ["tabular-nums"] },
  weekMinutesToday: { color: colors.text, fontWeight: "700" },
  subjectRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  subjectName: { width: 90, fontSize: fontSize.body, fontWeight: "600", color: colors.text },
  subjectBarTrack: {
    flex: 1,
    height: 6,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceElevated,
    overflow: "hidden",
  },
  subjectBarFill: { height: "100%", borderRadius: radius.full },
  subjectMinutes: {
    width: 44,
    textAlign: "right",
    fontSize: fontSize.body,
    fontWeight: "700",
    color: colors.textSecondary,
    fontVariant: ["tabular-nums"],
  },
  logoutRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  error: { color: colors.danger, fontSize: fontSize.body },
});
