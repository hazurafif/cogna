import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useAuth } from "../auth/AuthContext";
import { listSubjects, Subject } from "../api/subjects";
import { createSession, getSession, updateSession } from "../api/sessions";
import { localISO, todayDate } from "../utils/time";

export function NewSessionScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEdit = Boolean(id);
  const { token } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [date, setDate] = useState(todayDate());
  const [minutes, setMinutes] = useState("30");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token) return;
    listSubjects(token)
      .then(setSubjects)
      .catch(() => setError("Could not load subjects."));

    if (isEdit && id) {
      getSession(token, Number(id))
        .then((s) => {
          setSubjectId(s.subject_id);
          setDate(s.started_at.slice(0, 10));
          setMinutes(String(s.duration_minutes));
          setNote(s.note ?? "");
        })
        .catch(() => setError("Could not load session."));
    }
  }, [token, id, isEdit]);

  const onSave = async () => {
    if (!token || subjectId === null) return;
    setError(null);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setError("Enter a valid date like 2026-07-31.");
      return;
    }
    const mins = Number(minutes);
    if (!Number.isInteger(mins) || mins <= 0) {
      setError("Minutes must be a positive whole number.");
      return;
    }

    const [y, m, d] = date.split("-").map(Number);
    const started = new Date(y, m - 1, d, 0, 0, 0);
    if (
      started.getFullYear() !== y ||
      started.getMonth() !== m - 1 ||
      started.getDate() !== d
    ) {
      setError("Enter a valid date like 2026-07-31.");
      return;
    }

    setSaving(true);
    try {
      const ended = new Date(started.getTime() + mins * 60_000);
      const payload = {
        subject_id: subjectId,
        started_at: localISO(started),
        ended_at: localISO(ended),
        source: "manual" as const,
        note: note.trim() || null,
      };
      if (isEdit && id) {
        await updateSession(token, Number(id), payload);
      } else {
        await createSession(token, payload);
      }
      router.back();
    } catch {
      setError("Could not save session.");
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{isEdit ? "Edit session" : "Log a session"}</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.subjectRow}>
        {subjects.map((s) => (
          <Pressable
            key={s.id}
            onPress={() => setSubjectId(s.id)}
            style={[styles.chip, subjectId === s.id && styles.chipActive]}
          >
            <Text style={[styles.chipText, subjectId === s.id && styles.chipTextActive]}>
              {s.name}
            </Text>
          </Pressable>
        ))}
      </View>
      <TextInput
        style={styles.input}
        placeholder="Date (YYYY-MM-DD)"
        value={date}
        onChangeText={setDate}
      />
      <TextInput
        style={styles.input}
        placeholder="Minutes"
        value={minutes}
        onChangeText={setMinutes}
        keyboardType="number-pad"
      />
      <TextInput
        style={styles.input}
        placeholder="Note (optional)"
        value={note}
        onChangeText={setNote}
      />
      <Pressable
        style={[styles.button, subjectId === null && styles.buttonDisabled]}
        onPress={onSave}
        disabled={subjectId === null || saving}
      >
        <Text style={styles.buttonText}>{saving ? "Saving…" : "Save session"}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 12 },
  title: { fontSize: 24, fontWeight: "700" },
  subjectRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderWidth: 1, borderColor: "#d1d5db", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
  },
  chipActive: { backgroundColor: "#4F46E5", borderColor: "#4F46E5" },
  chipText: { fontSize: 14 },
  chipTextActive: { color: "#fff" },
  input: { borderWidth: 1, borderColor: "#d1d5db", borderRadius: 8, padding: 12, fontSize: 16 },
  button: {
    backgroundColor: "#4F46E5", borderRadius: 8, padding: 14, alignItems: "center",
  },
  buttonDisabled: { backgroundColor: "#a5b4fc" },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  error: { color: "#dc2626" },
});
