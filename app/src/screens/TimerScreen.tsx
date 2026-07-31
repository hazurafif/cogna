import React, { useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuth } from "../auth/AuthContext";
import { listSubjects, Subject } from "../api/subjects";
import { createSession } from "../api/sessions";
import { Button } from "../components/Button";
import { Chip } from "../components/Chip";
import { Screen } from "../components/Screen";
import { colors } from "../theme/colors";
import { fontSize, spacing } from "../theme/tokens";
import { localISO } from "../utils/time";

function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(h)}:${p(m)}:${p(s)}`;
}

export function TimerScreen() {
  const { token } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!token) return;
    listSubjects(token)
      .then(setSubjects)
      .catch(() => setError("Could not load subjects."));
  }, [token]);

  useEffect(() => {
    if (startedAt === null) return;
    intervalRef.current = setInterval(
      () => setElapsed(Date.now() - startedAt),
      1000,
    );
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [startedAt]);

  const start = () => {
    if (subjectId === null) return;
    setElapsed(0);
    setStartedAt(Date.now());
  };

  const stop = async () => {
    if (startedAt === null || subjectId === null || !token) return;
    if (intervalRef.current) clearInterval(intervalRef.current);
    setSaving(true);
    setError(null);
    try {
      await createSession(token, {
        subject_id: subjectId,
        started_at: localISO(new Date(startedAt)),
        ended_at: localISO(new Date()),
        source: "timer",
      });
      setStartedAt(null);
      router.push("/(tabs)/history");
    } catch {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(
        () => setElapsed(Date.now() - startedAt),
        1000,
      );
      setError("Could not save session. Try again.");
      setSaving(false);
    }
  };

  return (
    <Screen title="Study timer">
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.subjectRow}>
          {subjects.map((s) => (
            <Chip
              key={s.id}
              label={s.name}
              selected={subjectId === s.id}
              onPress={() => setSubjectId(s.id)}
            />
          ))}
        </View>
        {subjects.length === 0 ? (
          <Text style={styles.hint}>Add a subject first (Subjects tab).</Text>
        ) : null}

        {startedAt !== null ? (
          <View style={styles.timerBox}>
            <Ionicons name="stopwatch-outline" size={64} color={colors.primary} />
            <Text style={styles.elapsed} testID="elapsed">
              {formatElapsed(elapsed)}
            </Text>
            <Text style={styles.runningLabel}>
              {subjects.find((s) => s.id === subjectId)?.name ?? ""} · timer running
            </Text>
          </View>
        ) : null}

        <View style={styles.actions}>
          <Button
            title={startedAt === null ? "Start studying" : "Running…"}
            onPress={start}
            disabled={subjectId === null || startedAt !== null}
            testID="start-button"
          />
          {startedAt !== null ? (
            <Button
              title="Stop and save"
              variant="danger"
              onPress={stop}
              loading={saving}
              testID="stop-button"
            />
          ) : null}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg, paddingBottom: spacing.xl },
  subjectRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  hint: { color: colors.textMuted, fontSize: fontSize.body },
  timerBox: { alignItems: "center", gap: spacing.sm, marginTop: spacing.md },
  elapsed: {
    fontSize: fontSize.hero,
    fontWeight: "700",
    color: colors.text,
    fontVariant: ["tabular-nums"],
  },
  runningLabel: { color: colors.textSecondary, fontSize: fontSize.caption },
  actions: { gap: spacing.md, marginTop: spacing.md },
  error: { color: colors.danger, fontSize: fontSize.body },
});
