import React, { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useAuth } from "../auth/AuthContext";
import { deleteSession, getSession, StudySession } from "../api/sessions";
import { formatDuration } from "../utils/time";

export function SessionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  const [session, setSession] = useState<StudySession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const refresh = useCallback(async () => {
    if (!token || !id) return;
    try {
      setSession(await getSession(token, Number(id)));
      setError(null);
    } catch {
      setError("Could not load session.");
    }
  }, [token, id]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const onDelete = async () => {
    if (!token || !session || deleting) return;
    setDeleting(true);
    try {
      await deleteSession(token, session.id);
      router.back();
    } catch {
      setError("Could not delete session.");
      setDeleting(false);
    }
  };

  if (!session) {
    return (
      <View style={styles.container}>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.subjectRow}>
        <View style={[styles.dot, { backgroundColor: session.subject_color }]} />
        <Text style={styles.subjectName}>{session.subject_name}</Text>
      </View>
      <Text style={styles.duration}>{formatDuration(session.duration_minutes)}</Text>
      <Text style={styles.meta}>
        {session.started_at} → {session.ended_at}
      </Text>
      <Text style={styles.meta}>
        {session.source} · {session.duration_minutes} minutes
      </Text>
      {session.note ? <Text style={styles.note}>{session.note}</Text> : null}
      <Pressable style={styles.editButton} onPress={() => router.push(`/session/${session.id}/edit`)}>
        <Text style={styles.editText}>Edit</Text>
      </Pressable>
      <Pressable style={styles.deleteButton} onPress={onDelete} disabled={deleting}>
        <Text style={styles.deleteText}>{deleting ? "Deleting…" : "Delete"}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  content: { gap: 12 },
  subjectRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  dot: { width: 14, height: 14, borderRadius: 7 },
  subjectName: { fontSize: 18, fontWeight: "600" },
  duration: { fontSize: 40, fontWeight: "700" },
  meta: { fontSize: 14, color: "#6b7280" },
  note: { fontSize: 15, marginTop: 8 },
  editButton: {
    marginTop: 24, borderWidth: 1, borderColor: "#4F46E5", borderRadius: 8,
    padding: 12, alignItems: "center",
  },
  editText: { color: "#4F46E5", fontWeight: "600" },
  deleteButton: {
    marginTop: 12, borderWidth: 1, borderColor: "#dc2626", borderRadius: 8,
    padding: 12, alignItems: "center",
  },
  deleteText: { color: "#dc2626", fontWeight: "600" },
  error: { color: "#dc2626" },
});
