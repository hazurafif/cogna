import React, { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Clock, CalendarDays } from "lucide-react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useAuth } from "../auth/AuthContext";
import { deleteSession, getSession, StudySession } from "../api/sessions";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Screen } from "../components/Screen";
import { SubjectIcon } from "../components/SubjectIcon";
import { colors } from "../theme/colors";
import { fontSize, radius, spacing } from "../theme/tokens";
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
        <Card>
          <View style={styles.hero}>
            <View style={styles.heroGlow} />
            <View style={styles.subjectRow}>
              <SubjectIcon name={session.subject_icon} size={16} />
              <Text style={styles.subjectName}>{session.subject_name}</Text>
            </View>
            <Text style={styles.duration}>{formatDuration(session.duration_minutes)}</Text>
            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <CalendarDays size={13} strokeWidth={2.2} color={colors.textSecondary} />
                <Text style={styles.meta}>{session.started_at}</Text>
              </View>
              <View style={styles.metaItem}>
                <Clock size={13} strokeWidth={2.2} color={colors.textSecondary} />
                <Text style={styles.meta}>{session.duration_minutes} minutes</Text>
              </View>
              <Text style={styles.meta}>{session.source}</Text>
            </View>
          </View>
        </Card>
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
  content: { gap: spacing.md, paddingBottom: spacing.xl },
  hero: {
    gap: spacing.sm,
    overflow: "hidden",
  },
  heroGlow: {
    position: "absolute",
    top: -60,
    right: -60,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: colors.primarySoft,
  },
  subjectRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  subjectName: { fontSize: fontSize.title, fontWeight: "700", color: colors.text },
  duration: {
    fontSize: 40,
    fontWeight: "800",
    letterSpacing: -1.5,
    color: colors.text,
    fontVariant: ["tabular-nums"],
  },
  metaRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: spacing.md, marginTop: 4 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  meta: { fontSize: fontSize.caption, color: colors.textSecondary },
  note: {
    fontSize: fontSize.body,
    color: colors.text,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginTop: spacing.sm,
  },
  actions: { gap: spacing.md, marginTop: spacing.xl },
  error: { color: colors.danger, fontSize: fontSize.body },
});
