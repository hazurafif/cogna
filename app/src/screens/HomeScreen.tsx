import React, { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useAuth } from "../auth/AuthContext";
import { fetchSummary, Summary } from "../api/stats";
import { Button } from "../components/Button";
import { Screen } from "../components/Screen";
import { StatCard } from "../components/StatCard";
import { SubjectDot } from "../components/SubjectDot";
import { colors } from "../theme/colors";
import { fontSize, spacing } from "../theme/tokens";
import { formatDuration, formatMinutes } from "../utils/time";

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
        <Text style={styles.greeting}>Hi, {user?.email ?? "there"}</Text>
        <Pressable onPress={refresh} testID="refresh-button" hitSlop={8}>
          <Ionicons name="sync-outline" size={20} color={colors.textMuted} />
        </Pressable>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {summary ? (
        <>
          <View style={styles.cardRow}>
            <StatCard icon="time-outline" value={formatDuration(summary.total_minutes)} label="ALL TIME" />
            <StatCard icon="calendar-outline" value={formatDuration(summary.week_minutes)} label="THIS WEEK" />
            <StatCard icon="flame-outline" value={`${summary.streak_days} days`} label="STREAK" highlighted />
          </View>
          <Text style={styles.sectionTitle}>By subject</Text>
          {summary.per_subject.map((s) => (
            <View key={s.subject_id} style={styles.subjectRow}>
              <SubjectDot color={s.color} />
              <Text style={styles.subjectName}>{s.name}</Text>
              <Text style={styles.subjectMinutes}>{formatMinutes(s.minutes)}</Text>
            </View>
          ))}
        </>
      ) : null}
      <View style={styles.logoutRow}>
        <Ionicons name="log-out-outline" size={16} color={colors.textSecondary} />
        <Button title="Log out" variant="outline" onPress={() => logout()} testID="logout-button" />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  greeting: { fontSize: fontSize.body, fontWeight: "600", color: colors.textSecondary },
  cardRow: { flexDirection: "row", gap: spacing.sm },
  sectionTitle: { fontSize: fontSize.title, fontWeight: "600", color: colors.text, marginTop: spacing.sm },
  subjectRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm + spacing.xs,
    paddingVertical: spacing.xs + 2,
  },
  subjectName: { flex: 1, fontSize: fontSize.body, color: colors.text },
  subjectMinutes: { fontSize: fontSize.body, fontWeight: "600", color: colors.text, fontVariant: ["tabular-nums"] },
  logoutRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  error: { color: colors.danger, fontSize: fontSize.body },
});
