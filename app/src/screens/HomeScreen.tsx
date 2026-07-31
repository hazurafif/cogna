import React, { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { useAuth } from "../auth/AuthContext";
import { fetchSummary, Summary } from "../api/stats";
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
    <View style={styles.container}>
      <Text style={styles.greeting}>Hi, {user?.email ?? "there"}</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {summary ? (
        <>
          <View style={styles.cardRow}>
            <View style={styles.card}>
              <Text style={styles.cardValue}>{formatDuration(summary.total_minutes)}</Text>
              <Text style={styles.cardLabel}>All time</Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardValue}>{formatDuration(summary.week_minutes)}</Text>
              <Text style={styles.cardLabel}>This week</Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardValue}>{summary.streak_days} days</Text>
              <Text style={styles.cardLabel}>Streak</Text>
            </View>
          </View>
          <Text style={styles.sectionTitle}>By subject</Text>
          {summary.per_subject.map((s) => (
            <View key={s.subject_id} style={styles.subjectRow}>
              <View style={[styles.dot, { backgroundColor: s.color }]} />
              <Text style={styles.subjectName}>{s.name}</Text>
              <Text style={styles.subjectMinutes}>{formatMinutes(s.minutes)}</Text>
            </View>
          ))}
        </>
      ) : null}
      <Pressable style={styles.logoutButton} onPress={() => void logout()}>
        <Text style={styles.logoutText}>Log out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  greeting: { fontSize: 18, fontWeight: "600" },
  cardRow: { flexDirection: "row", gap: 8 },
  card: {
    flex: 1, backgroundColor: "#f3f4f6", borderRadius: 12, padding: 12, alignItems: "center",
  },
  cardValue: { fontSize: 18, fontWeight: "700" },
  cardLabel: { fontSize: 12, color: "#6b7280" },
  sectionTitle: { fontSize: 16, fontWeight: "600", marginTop: 8 },
  subjectRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 6 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  subjectName: { flex: 1, fontSize: 15 },
  subjectMinutes: { fontSize: 15, fontWeight: "600" },
  error: { color: "#dc2626" },
  logoutButton: {
    marginTop: 24, borderWidth: 1, borderColor: "#4F46E5", borderRadius: 8,
    padding: 12, alignItems: "center",
  },
  logoutText: { color: "#4F46E5", fontWeight: "600" },
});
