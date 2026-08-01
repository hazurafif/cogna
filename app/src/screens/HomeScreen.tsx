import React, { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { RefreshCw, Clock, CalendarDays, Flame, LogOut } from "lucide-react-native";
import { useFocusEffect } from "expo-router";
import { useAuth } from "../auth/AuthContext";
import { fetchSummary, Summary } from "../api/stats";
import { Button } from "../components/Button";
import { Screen } from "../components/Screen";
import { StatCard } from "../components/StatCard";
import { SubjectDot } from "../components/SubjectDot";
import { colors } from "../theme/colors";
import { fontSize, radius, spacing } from "../theme/tokens";
import { formatDuration, formatMinutes } from "../utils/time";

function initialOf(email: string): string {
  return email.trim().charAt(0).toUpperCase() || "?";
}

export function HomeScreen() {
  const { token, user, logout } = useAuth();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      setSummary(await fetchSummary(token));
      setError(null);
    } catch {
      setError("Could not load stats. Is the backend running?");
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
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
      {summary ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <View style={styles.cardRow}>
            <StatCard icon={Clock} value={formatDuration(summary.total_minutes)} label="ALL TIME" />
            <StatCard icon={CalendarDays} value={formatDuration(summary.week_minutes)} label="THIS WEEK" />
            <StatCard icon={Flame} value={`${summary.streak_days} days`} label="STREAK" highlighted />
          </View>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>By subject</Text>
            <Text style={styles.sectionHint}>{summary.per_subject.length} tracked</Text>
          </View>
          {summary.per_subject.map((s) => (
            <View key={s.subject_id} style={styles.subjectRow}>
              <SubjectDot color={s.color} size={10} />
              <Text style={styles.subjectName}>{s.name}</Text>
              <View style={styles.subjectBarTrack}>
                <View
                  style={[
                    styles.subjectBarFill,
                    {
                      backgroundColor: s.color,
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
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginTop: spacing.xs,
  },
  sectionTitle: { fontSize: fontSize.title, fontWeight: "700", color: colors.text, letterSpacing: -0.3 },
  sectionHint: { fontSize: fontSize.caption, color: colors.textMuted },
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
