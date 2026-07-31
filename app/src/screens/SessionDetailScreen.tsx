import React, { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useAuth } from "../auth/AuthContext";
import { deleteSession, getSession, StudySession } from "../api/sessions";
import { Button } from "../components/Button";
import { Screen } from "../components/Screen";
import { SubjectDot } from "../components/SubjectDot";
import { colors } from "../theme/colors";
import { fontSize, spacing } from "../theme/tokens";
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
      <Screen>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </Screen>
    );
  }

  return (
    <Screen>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.subjectRow}>
          <SubjectDot color={session.subject_color} size={14} />
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
        <View style={styles.actions}>
          <Button
            title="Edit"
            variant="outline"
            onPress={() => router.push(`/session/${session.id}/edit`)}
            testID="edit-button"
          />
          <Button
            title="Delete"
            variant="danger"
            onPress={onDelete}
            loading={deleting}
            testID="delete-button"
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md },
  subjectRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  subjectName: { fontSize: fontSize.title, fontWeight: "600", color: colors.text },
  duration: {
    fontSize: 40,
    fontWeight: "700",
    color: colors.text,
    fontVariant: ["tabular-nums"],
  },
  meta: { fontSize: fontSize.caption, color: colors.textSecondary },
  note: { fontSize: fontSize.body, color: colors.text, marginTop: spacing.sm },
  actions: { gap: spacing.md, marginTop: spacing.xl },
  error: { color: colors.danger, fontSize: fontSize.body },
});
