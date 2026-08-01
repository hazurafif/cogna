import React, { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { CalendarDays, Clock, Flame, LogOut, Trophy } from "lucide-react-native";
import { useFocusEffect } from "expo-router";
import { useAuth } from "../auth/AuthContext";
import { listSessions, StudySession } from "../api/sessions";
import { fetchSummary, Summary } from "../api/stats";
import { Button } from "../components/Button";
import { Screen } from "../components/Screen";
import { StatCard } from "../components/StatCard";
import { SubjectIcon } from "../components/SubjectIcon";
import { subjectLabel } from "../constants/subjectIcons";
import { colors } from "../theme/colors";
import { fontSize, radius, spacing } from "../theme/tokens";
import { formatDuration, formatMinutes } from "../utils/time";
import {
  bestStreak,
  heatIntensity,
  minutesPerDay,
  monthHeatmap,
  monthKey,
  streakCopy,
  streakMilestone,
  weeklyTotals,
} from "../utils/daily";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const HEAT_COLORS = [
  colors.surfaceElevated,
  "rgba(252, 76, 2, 0.2)",
  "rgba(252, 76, 2, 0.4)",
  "rgba(252, 76, 2, 0.65)",
  colors.primary,
];

function initialOf(email: string): string {
  return email.trim().charAt(0).toUpperCase() || "?";
}

function memberSince(createdAt: string): string {
  const [date] = createdAt.split("T");
  if (!date) return "";
  const [y, m] = date.split("-").map(Number);
  if (!y || !m) return "";
  return `${MONTHS[m - 1]} ${y}`;
}

function nextMilestone(streak: number): string {
  for (const target of [3, 7, 14, 30]) {
    if (streak < target) return `${target - streak} days to your ${target}-day milestone`;
  }
  return "You hit every milestone. Incredible!";
}

type MonthBlock = {
  year: number;
  month: number;
  label: string;
  key: string;
};

function recentMonths(now: Date, count: number): MonthBlock[] {
  const blocks: MonthBlock[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    blocks.push({
      year: d.getFullYear(),
      month: d.getMonth(),
      label: `${MONTHS[d.getMonth()]} ${d.getFullYear()}`,
      key: monthKey(d),
    });
  }
  return blocks;
}

export function YouScreen() {
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

  const perDay = minutesPerDay(sessions);
  const months = recentMonths(new Date(), 6);
  const weeks = weeklyTotals(sessions, 8);
  const maxWeekMinutes = Math.max(...weeks.map((w) => w.minutes), 1);
  const best = bestStreak(sessions);
  const milestone = summary ? streakMilestone(summary.streak_days) : null;
  const streakNote = summary ? streakCopy(summary.streak_days, sessions.length > 0) : null;
  const maxSubjectMinutes = summary
    ? Math.max(...summary.per_subject.map((s) => s.minutes), 1)
    : 1;

  return (
    <Screen title="You">
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user ? initialOf(user.email) : "?"}</Text>
          </View>
          <View style={styles.profileBody}>
            <Text style={styles.email}>{user?.email ?? "—"}</Text>
            <Text style={styles.memberSince}>
              {user ? `Member since ${memberSince(user.created_at)}` : ""}
            </Text>
          </View>
          <Button
            title="Log out"
            variant="outline"
            onPress={() => logout()}
            testID="logout-button"
          />
        </View>

        {summary ? (
          <View style={styles.cardRow}>
            <StatCard icon={Clock} value={formatDuration(summary.total_minutes)} label="TOTAL" />
            <StatCard icon={CalendarDays} value={formatDuration(summary.week_minutes)} label="WEEK" />
          </View>
        ) : null}
        {summary ? (
          <View style={styles.cardRow}>
            <StatCard icon={Flame} value={`${summary.streak_days} days`} label="STREAK" highlighted />
            <StatCard icon={Trophy} value={`${best} days`} label="BEST" />
          </View>
        ) : null}

        {streakNote ? (
          <View style={styles.streakRow}>
            <Flame size={14} strokeWidth={2.2} color={colors.primary} />
            <Text style={styles.streakNote}>{streakNote}</Text>
            {milestone ? <Text style={styles.milestoneBadge}>{milestone}</Text> : null}
          </View>
        ) : null}
        {summary ? (
          <Text style={styles.nextMilestone}>{nextMilestone(summary.streak_days)}</Text>
        ) : null}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Activity calendar</Text>
        </View>
        {months.map((m) => (
          <View key={m.key} style={styles.monthCard}>
            <Text style={styles.monthLabel}>{m.label}</Text>
            {monthHeatmap(m.year, m.month, perDay).map((week, wi) => (
              <View key={wi} style={styles.heatWeek}>
                {week.map((cell, ci) => {
                  if (!cell) return <View key={ci} style={styles.heatCell} />;
                  return (
                    <View
                      key={ci}
                      testID={`heat-cell-${cell.key}`}
                      style={[styles.heatCell, { backgroundColor: HEAT_COLORS[heatIntensity(cell.minutes)] }]}
                    />
                  );
                })}
              </View>
            ))}
          </View>
        ))}

        {summary ? (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>By subject</Text>
              <Text style={styles.sectionHint}>{summary.per_subject.length} tracked</Text>
            </View>
            {summary.per_subject.length === 0 ? (
              <Text style={styles.sectionHint}>No sessions yet.</Text>
            ) : (
              summary.per_subject.map((s) => (
                <View key={s.subject_id} style={styles.subjectRow}>
                  <SubjectIcon name={s.icon} size={14} />
                  <Text style={styles.subjectName}>{subjectLabel(s.name)}</Text>
                  <View style={styles.subjectBarTrack}>
                    <View
                      style={[
                        styles.subjectBarFill,
                        { width: `${Math.max(4, (s.minutes / maxSubjectMinutes) * 100)}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.subjectMinutes}>{formatMinutes(s.minutes)}</Text>
                </View>
              ))
            )}

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Last 8 weeks</Text>
              <Text style={styles.sectionHint}>{formatDuration(summary.week_minutes)} this week</Text>
            </View>
            <View style={styles.weekRow}>
              {weeks.map((w) => (
                <View key={w.weekStart} style={styles.weekDay}>
                  <View style={styles.weekBarTrack}>
                    <View
                      style={[
                        styles.weekBarFill,
                        { height: `${Math.max(10, (w.minutes / maxWeekMinutes) * 100)}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.weekMinutes}>
                    {w.minutes > 0 ? formatMinutes(w.minutes) : "–"}
                  </Text>
                </View>
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg, paddingBottom: spacing.xl },
  error: { color: colors.danger, fontSize: fontSize.body },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: colors.white, fontSize: fontSize.heading, fontWeight: "800" },
  profileBody: { flex: 1 },
  email: { fontSize: fontSize.body, fontWeight: "700", color: colors.text },
  memberSince: { fontSize: fontSize.caption, color: colors.textMuted, marginTop: 2 },
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
  nextMilestone: { fontSize: fontSize.caption, color: colors.textMuted },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginTop: spacing.xs,
  },
  sectionTitle: { fontSize: fontSize.title, fontWeight: "700", color: colors.text, letterSpacing: -0.3 },
  sectionHint: { fontSize: fontSize.caption, color: colors.textMuted },
  monthCard: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  monthLabel: { fontSize: fontSize.body, fontWeight: "700", color: colors.textSecondary },
  heatWeek: { flexDirection: "row", gap: spacing.xs },
  heatCell: {
    width: 20,
    height: 20,
    borderRadius: 5,
    backgroundColor: colors.surface,
  },
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
  subjectBarFill: { height: "100%", borderRadius: radius.full, backgroundColor: colors.primary },
  subjectMinutes: {
    width: 44,
    textAlign: "right",
    fontSize: fontSize.body,
    fontWeight: "700",
    color: colors.textSecondary,
    fontVariant: ["tabular-nums"],
  },
  weekRow: { flexDirection: "row", gap: spacing.sm },
  weekDay: { flex: 1, alignItems: "center", gap: spacing.sm },
  weekBarTrack: {
    height: 64,
    width: "100%",
    justifyContent: "flex-end",
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.sm,
    padding: 2,
  },
  weekBarFill: { width: "100%", borderRadius: radius.sm, backgroundColor: colors.primary },
  weekMinutes: { fontSize: fontSize.label, color: colors.textMuted, fontVariant: ["tabular-nums"] },
});
