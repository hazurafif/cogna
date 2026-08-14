import React, { useCallback, useState } from "react";
import { StyleSheet, View as RNView } from "react-native";
import { CalendarDays, Clock, Flame, Trophy } from "lucide-react-native";
import { useFocusEffect } from "expo-router";
import { useAuth } from "../auth/AuthContext";
import { listSessions, StudySession } from "../api/sessions";
import { fetchSummary, Summary } from "../api/stats";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Screen } from "../components/Screen";
import { StatCard } from "../components/StatCard";
import { SubjectIcon } from "../components/SubjectIcon";
import { subjectLabel } from "../constants/subjectIcons";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../components/ui/accordion";
import { Avatar, AvatarFallback } from "../components/ui/avatar";
import { Badge } from "../components/ui/badge";
import { Icon } from "../components/ui/icon";
import { ModeToggle } from "../components/ui/mode-toggle";
import { ScrollView } from "../components/ui/scroll-view";
import { Skeleton } from "../components/ui/skeleton";
import { Text } from "../components/ui/text";
import { View } from "../components/ui/view";
import { useColor } from "../hooks/useColor";
import { withOpacity } from "../theme/colors";
import { appFonts } from "../theme/fonts";
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const primaryColor = useColor("primary");
  const accentColor = useColor("accent");
  const cardColor = useColor("card");
  const mutedColor = useColor("textMuted");
  const iconColor = useColor("icon");
  const dangerColor = useColor("error");

  const refresh = useCallback(async () => {
    if (!token) return;
    setLoading(true);
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
    } finally {
      setLoading(false);
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

  // Heatmap buckets derived from the active BNA scheme.
  const heatColors = [
    cardColor,
    withOpacity(primaryColor, 0.2),
    withOpacity(primaryColor, 0.4),
    withOpacity(primaryColor, 0.65),
    primaryColor,
  ];

  return (
    <Screen title="You">
      {error ? <Text style={[styles.error, { color: dangerColor }]}>{error}</Text> : null}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Card>
          <View style={styles.profileRow}>
            <Avatar size={52}>
              <AvatarFallback
                style={{ backgroundColor: primaryColor }}
                textStyle={styles.avatarText}
              >
                {user ? initialOf(user.email) : "?"}
              </AvatarFallback>
            </Avatar>
            <View style={styles.profileBody}>
              <Text style={styles.email}>{user?.email ?? "—"}</Text>
              <Text style={[styles.memberSince, { color: mutedColor }]}>
                {user ? `Member since ${memberSince(user.created_at)}` : ""}
              </Text>
            </View>
            <ModeToggle haptic={false} />
            <Button
              title="Log out"
              variant="outline"
              onPress={() => logout()}
              testID="logout-button"
            />
          </View>
        </Card>

        {loading ? (
          <>
            <View style={styles.cardRow}>
              <Skeleton height={90} variant="rounded" />
              <Skeleton height={90} variant="rounded" />
            </View>
            <View style={styles.cardRow}>
              <Skeleton height={90} variant="rounded" />
              <Skeleton height={90} variant="rounded" />
            </View>
          </>
        ) : (
          <>
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
          </>
        )}

        {streakNote ? (
          <View style={styles.streakRow}>
            <Icon name={Flame} size={14} strokeWidth={2.2} color={primaryColor} />
            <Text style={[styles.streakNote, { color: iconColor }]}>{streakNote}</Text>
            {milestone ? (
              <Badge
                variant="secondary"
                textStyle={{ ...styles.milestoneBadge, color: primaryColor }}
                style={{ backgroundColor: accentColor }}
              >
                {milestone}
              </Badge>
            ) : null}
          </View>
        ) : null}
        {summary ? (
          <Text style={[styles.nextMilestone, { color: mutedColor }]}>
            {nextMilestone(summary.streak_days)}
          </Text>
        ) : null}

        <Accordion
          type="multiple"
          defaultValue={["calendar", "subjects", "weeks"]}
          haptic={false}
        >
          <AccordionItem value="calendar">
            <AccordionTrigger>Activity calendar</AccordionTrigger>
            <AccordionContent>
              {loading ? (
                <Skeleton height={180} variant="rounded" />
              ) : (
                months.map((m) => (
                  <Card key={m.key} style={styles.monthCard}>
                    <Text style={[styles.monthLabel, { color: iconColor }]}>{m.label}</Text>
                    {monthHeatmap(m.year, m.month, perDay).map((week, wi) => (
                      <View key={wi} style={styles.heatWeek}>
                        {week.map((cell, ci) => {
                          if (!cell) {
                            return (
                              <RNView
                                key={ci}
                                style={[styles.heatCell, { backgroundColor: cardColor }]}
                              />
                            );
                          }
                          return (
                            <RNView
                              key={ci}
                              testID={`heat-cell-${cell.key}`}
                              style={[styles.heatCell, { backgroundColor: heatColors[heatIntensity(cell.minutes)] }]}
                            />
                          );
                        })}
                      </View>
                    ))}
                  </Card>
                ))
              )}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="subjects">
            <AccordionTrigger>By subject</AccordionTrigger>
            <AccordionContent>
              {loading ? (
                <Skeleton height={80} variant="rounded" />
              ) : summary && summary.per_subject.length === 0 ? (
                <Text style={[styles.sectionHint, { color: mutedColor }]}>No sessions yet.</Text>
              ) : (
                summary?.per_subject.map((s) => (
                  <View key={s.subject_id} style={styles.subjectRow}>
                    <SubjectIcon name={s.icon} size={14} />
                    <Text style={styles.subjectName}>{subjectLabel(s.name)}</Text>
                    <View style={[styles.subjectBarTrack, { backgroundColor: mutedColor }]}>
                      <View
                        style={[
                          styles.subjectBarFill,
                          { width: `${Math.max(4, (s.minutes / maxSubjectMinutes) * 100)}%`, backgroundColor: primaryColor },
                        ]}
                      />
                    </View>
                    <Text style={[styles.subjectMinutes, { color: iconColor }]}>
                      {formatMinutes(s.minutes)}
                    </Text>
                  </View>
                ))
              )}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="weeks">
            <AccordionTrigger>Last 8 weeks</AccordionTrigger>
            <AccordionContent>
              {loading ? (
                <Skeleton height={90} variant="rounded" />
              ) : summary ? (
                <View style={styles.weekRow}>
                  {weeks.map((w) => (
                    <View key={w.weekStart} style={styles.weekDay}>
                      <View style={[styles.weekBarTrack, { backgroundColor: mutedColor }]}>
                        <View
                          style={[
                            styles.weekBarFill,
                            { height: `${Math.max(10, (w.minutes / maxWeekMinutes) * 100)}%`, backgroundColor: primaryColor },
                          ]}
                        />
                      </View>
                      <Text style={[styles.weekMinutes, { color: mutedColor }]}>
                        {w.minutes > 0 ? formatMinutes(w.minutes) : "–"}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg, paddingBottom: spacing.xl },
  error: { fontSize: fontSize.body },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  avatarText: { fontSize: fontSize.heading, fontFamily: appFonts.extraBold },
  profileBody: { flex: 1 },
  email: { fontSize: fontSize.body, fontFamily: appFonts.bold },
  memberSince: { fontSize: fontSize.caption, marginTop: 2 },
  cardRow: { flexDirection: "row", gap: spacing.sm },
  streakRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  streakNote: { flex: 1, fontSize: fontSize.caption },
  milestoneBadge: {
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    fontSize: fontSize.caption,
    fontFamily: appFonts.bold,
    overflow: "hidden",
  },
  nextMilestone: { fontSize: fontSize.caption },
  monthCard: { gap: spacing.sm },
  monthLabel: { fontSize: fontSize.body, fontFamily: appFonts.bold },
  heatWeek: { flexDirection: "row", gap: spacing.xs },
  heatCell: {
    width: 20,
    height: 20,
    borderRadius: 5,
  },
  subjectRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  subjectName: { width: 90, fontSize: fontSize.body, fontFamily: appFonts.semibold },
  subjectBarTrack: {
    flex: 1,
    height: 6,
    borderRadius: radius.full,
    overflow: "hidden",
  },
  subjectBarFill: { height: "100%", borderRadius: radius.full },
  subjectMinutes: {
    width: 44,
    textAlign: "right",
    fontSize: fontSize.body,
    fontFamily: appFonts.bold,
    fontVariant: ["tabular-nums"],
  },
  weekRow: { flexDirection: "row", gap: spacing.sm },
  weekDay: { flex: 1, alignItems: "center", gap: spacing.sm },
  weekBarTrack: {
    height: 64,
    width: "100%",
    justifyContent: "flex-end",
    borderRadius: radius.sm,
    padding: 2,
  },
  weekBarFill: { width: "100%", borderRadius: radius.sm },
  weekMinutes: { fontSize: fontSize.label, fontVariant: ["tabular-nums"] },
  sectionHint: { fontSize: fontSize.caption },
});
