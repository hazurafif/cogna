import React, { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useAuth } from "../auth/AuthContext";
import { listSubjects, Subject } from "../api/subjects";
import { createSession } from "../api/sessions";
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
      setError("Could not save session. Try again.");
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Study timer</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.subjectRow}>
        {subjects.map((s) => (
          <Pressable
            key={s.id}
            testID={`subject-${s.id}`}
            onPress={() => setSubjectId(s.id)}
            style={[styles.chip, subjectId === s.id && styles.chipActive]}
          >
            <Text style={[styles.chipText, subjectId === s.id && styles.chipTextActive]}>
              {s.name}
            </Text>
          </Pressable>
        ))}
      </View>
      {subjects.length === 0 ? (
        <Text>Add a subject first (Subjects tab).</Text>
      ) : null}

      {startedAt !== null ? (
        <Text style={styles.elapsed} testID="elapsed">
          {formatElapsed(elapsed)}
        </Text>
      ) : null}

      <Pressable
        testID="start-button"
        style={[styles.button, subjectId === null && styles.buttonDisabled]}
        onPress={start}
        disabled={subjectId === null}
      >
        <Text style={styles.buttonText}>
          {startedAt === null ? "Start studying" : "Running…"}
        </Text>
      </Pressable>

      {startedAt !== null ? (
        <Pressable testID="stop-button" style={styles.stopButton} onPress={stop} disabled={saving}>
          <Text style={styles.buttonText}>{saving ? "Saving…" : "Stop and save"}</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 16 },
  title: { fontSize: 24, fontWeight: "700" },
  subjectRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderWidth: 1, borderColor: "#d1d5db", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
  },
  chipActive: { backgroundColor: "#4F46E5", borderColor: "#4F46E5" },
  chipText: { fontSize: 14 },
  chipTextActive: { color: "#fff" },
  elapsed: {
    fontSize: 56, fontWeight: "700", textAlign: "center", fontVariant: ["tabular-nums"],
  },
  button: {
    backgroundColor: "#4F46E5", borderRadius: 999, paddingVertical: 16, alignItems: "center",
  },
  buttonDisabled: { backgroundColor: "#a5b4fc" },
  stopButton: {
    backgroundColor: "#dc2626", borderRadius: 999, paddingVertical: 16, alignItems: "center",
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  error: { color: "#dc2626" },
});
