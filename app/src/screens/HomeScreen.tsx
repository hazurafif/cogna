import React, { useCallback, useRef, useState } from "react";
import { Pressable, SectionList, StyleSheet } from "react-native";
import { RefreshCw, ChevronRight, History, Search, Target, Trophy } from "lucide-react-native";
import { router, useFocusEffect } from "expo-router";
import { useAuth } from "../auth/AuthContext";
import { listSessions, StudySession } from "../api/sessions";
import { fetchSettings } from "../api/settings";
import { fetchSummary } from "../api/stats";
import { fetchCurrentChallenge, ChallengeProgress } from "../api/challenges";
import { syncReminders } from "../notifications/reminders";
import { Card } from "../components/Card";
import { Screen } from "../components/Screen";
import { SubjectIcon } from "../components/SubjectIcon";
import { subjectLabel } from "../constants/subjectIcons";
import { Avatar, AvatarFallback } from "../components/ui/avatar";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { HelloWave } from "../components/ui/hello-wave";
import { Icon } from "../components/ui/icon";
import { Input } from "../components/ui/input";
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

const PAGE_SIZE = 50;

function initialOf(nameOrEmail: string): string {
  return nameOrEmail.trim().charAt(0).toUpperCase() || "?";
}

function challengeValueText(ch: ChallengeProgress): string {
  if (ch.challenge.unit === "minutes") {
    return `${formatDuration(ch.value)} of ${formatDuration(ch.challenge.target)}`;
  }
  return `${ch.value} of ${ch.challenge.target} ${ch.challenge.unit}`;
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
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [goalMinutes, setGoalMinutes] = useState(DAILY_GOAL_MINUTES);
  const [challenge, setChallenge] = useState<ChallengeProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const queryRef = useRef("");
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const primaryColor = useColor("primary");
  const cardColor = useColor("card");
  const borderColor = useColor("border");
  const mutedColor = useColor("textMuted");
  const iconColor = useColor("icon");
  const dangerColor = useColor("error");

  const load = useCallback(
    async (q: string, offset: number, append: boolean) => {
      if (!token) return;
      setLoading(true);
      try {
        const page = await listSessions(token, { q: q || undefined, limit: PAGE_SIZE, offset });
        setSessions((prev) => (append ? [...prev, ...page.sessions] : page.sessions));
        setTotal(page.total);
        setError(null);
      } catch {
        setError("Could not load sessions. Is the backend running?");
      } finally {
        setLoading(false);
      }
    },
    [token],
  );

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      const [settings, summary] = await Promise.all([
        fetchSettings(token),
        fetchSummary(token),
      ]);
      setGoalMinutes(settings.daily_goal_minutes);
      syncReminders(
        { enabled: settings.reminder_enabled, time: settings.reminder_time },
        summary.streak_days,
      ).catch(() => {});
    } catch {
      // keep the previous goal and reminders
    }
    try {
      setChallenge(await fetchCurrentChallenge(token));
    } catch {
      setChallenge(null);
    }
    await load(queryRef.current, 0, false);
  }, [token, load]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const onQueryChange = (text: string) => {
    queryRef.current = text;
    setQuery(text);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      refresh();
    }, 300);
  };

  const loadMore = () => load(queryRef.current, sessions.length, true);

  const sections = groupSessionsByDay(sessions);
  const week = weekMinutes(sessions);
  const goalDays = goalDaysThisWeek(sessions, goalMinutes);
  const today = todayMinutes(sessions);
  const goalPct = Math.min(100, Math.round((today / goalMinutes) * 100));
  const hasMore = sessions.length < total;
  const displayName = (user?.name?.trim() || user?.email) ?? "there";
  const challengePct = challenge
    ? Math.min(100, Math.round((challenge.value / challenge.challenge.target) * 100))
    : 0;

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
            {formatMinutes(today)} <Text style={[styles.goalOf, { color: mutedColor }]}>/ {formatDuration(goalMinutes)}</Text>
          </Text>
        </View>
        <Progress value={goalPct} height={8} style={styles.goalTrack} />
      </Card>

      {challenge ? (
        <Card testID="challenge-card">
          <View style={styles.challengeHeader}>
            <View style={styles.goalTitleWrap}>
              <Icon name={Trophy} size={16} strokeWidth={2.2} color={primaryColor} />
              <Text style={styles.challengeTitle}>
                {challenge.completed ? "Challenge complete!" : challenge.challenge.name}
              </Text>
            </View>
            <Text style={[styles.challengeDays, { color: mutedColor }]}>
              {challenge.completed ? "🎉" : `${challenge.days_left} days left`}
            </Text>
          </View>
          <Text style={[styles.challengeDesc, { color: mutedColor }]}>
            {challenge.challenge.description}
          </Text>
          <Progress value={challengePct} height={8} />
          <Text style={[styles.challengeValue, { color: iconColor }]}>
            {challengeValueText(challenge)} · {challengePct}%
          </Text>
        </Card>
      ) : null}
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
              {user ? initialOf(user.name?.trim() || user.email) : "?"}
            </AvatarFallback>
          </Avatar>
          <View>
            <View style={styles.greetingRow}>
              <Text style={styles.greeting}>Hi, {displayName}</Text>
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

      <Input
        variant="filled"
        icon={Search}
        placeholder="Search notes or subjects"
        placeholderTextColor={mutedColor}
        value={query}
        onChangeText={onQueryChange}
        testID="search-input"
        rightComponent={
          query !== "" ? (
            <Pressable onPress={() => onQueryChange("")} hitSlop={8} testID="clear-search-button">
              <Text style={[styles.clearSearch, { color: primaryColor }]}>Clear</Text>
            </Pressable>
          ) : null
        }
      />

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
              <Text style={styles.emptyTitle}>
                {query !== "" ? "No matching sessions" : "No sessions yet"}
              </Text>
              <Text style={[styles.emptyBody, { color: mutedColor }]}>
                {query !== ""
                  ? "Try a different search."
                  : "Head to the Record tab to start your first study session."}
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          hasMore ? (
            <Button
              variant="secondary"
              size="sm"
              onPress={loadMore}
              testID="load-more-button"
              haptic={false}
            >
              {`Load more (${total - sessions.length} left)`}
            </Button>
          ) : null
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
  challengeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  challengeTitle: { fontSize: fontSize.body, fontFamily: appFonts.bold },
  challengeDays: { fontSize: fontSize.caption },
  challengeDesc: { fontSize: fontSize.caption, marginTop: spacing.xs },
  challengeValue: { fontSize: fontSize.caption, marginTop: spacing.sm },
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
  clearSearch: { fontSize: fontSize.body, fontFamily: appFonts.semibold },
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
