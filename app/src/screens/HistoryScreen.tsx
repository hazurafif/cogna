import React, { useCallback, useState } from "react";
import { Pressable, SectionList, StyleSheet, Text, View } from "react-native";
import { Plus, ChevronRight, History } from "lucide-react-native";
import { router, useFocusEffect } from "expo-router";
import { useAuth } from "../auth/AuthContext";
import { listSessions, StudySession } from "../api/sessions";
import { Screen } from "../components/Screen";
import { SubjectIcon } from "../components/SubjectIcon";
import { colors } from "../theme/colors";
import { fontSize, radius, shadow, spacing } from "../theme/tokens";
import { formatDuration } from "../utils/time";
import { groupSessionsByDay } from "../utils/daily";

function formatTime(startedAt: string): string {
  const [date, time] = startedAt.split("T");
  if (!time) return date.slice(5);
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${period}`;
}

export function HistoryScreen() {
  const { token } = useAuth();
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      setSessions(await listSessions(token));
      setError(null);
    } catch {
      setError("Could not load sessions.");
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const sections = groupSessionsByDay(sessions);

  return (
    <Screen title="History">
      <View style={styles.header}>
        <Text style={styles.count}>
          {sessions.length === 0 ? "" : `${sessions.length} ${sessions.length === 1 ? "session" : "sessions"}`}
        </Text>
        <Pressable onPress={() => router.push("/session/new")} style={styles.addLink}>
          <View style={styles.addIcon}>
            <Plus size={14} strokeWidth={3} color={colors.primary} />
          </View>
          <Text style={styles.addText}>Log manually</Text>
        </Pressable>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <SectionList
        sections={sections}
        keyExtractor={(s) => String(s.id)}
        contentContainerStyle={styles.list}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => (
          <Text style={styles.dayLabel}>{section.label}</Text>
        )}
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            onPress={() => router.push(`/session/${item.id}`)}
          >
            <View style={styles.iconChip}>
              <SubjectIcon name={item.subject_icon} size={16} />
            </View>
            <View style={styles.rowBody}>
              <Text style={styles.rowName}>{item.subject_name}</Text>
              <Text style={styles.rowMeta}>
                {formatTime(item.started_at)} · {item.source}
              </Text>
            </View>
            <Text style={styles.rowDuration}>{formatDuration(item.duration_minutes)}</Text>
            <ChevronRight size={16} strokeWidth={2.2} color={colors.textMuted} />
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <History size={26} strokeWidth={2} color={colors.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>No sessions yet</Text>
            <Text style={styles.emptyBody}>
              Start the timer or log a session manually to see it here.
            </Text>
          </View>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  count: { fontSize: fontSize.caption, color: colors.textMuted },
  addLink: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  addIcon: {
    width: 24,
    height: 24,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  addText: { color: colors.primary, fontWeight: "700", fontSize: fontSize.body },
  list: { gap: spacing.sm, paddingBottom: spacing.xl },
  dayLabel: {
    fontSize: fontSize.caption,
    fontWeight: "800",
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  iconChip: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    ...shadow.card,
  },
  rowPressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
  rowBody: { flex: 1 },
  rowName: { fontSize: fontSize.body, fontWeight: "700", color: colors.text },
  rowMeta: { fontSize: fontSize.caption, color: colors.textSecondary, marginTop: 2 },
  rowDuration: {
    fontSize: fontSize.body,
    fontWeight: "800",
    color: colors.text,
    fontVariant: ["tabular-nums"],
  },
  error: { color: colors.danger, fontSize: fontSize.body },
  empty: { alignItems: "center", gap: spacing.sm, marginTop: spacing.xl * 2 },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: { fontSize: fontSize.title, fontWeight: "700", color: colors.text },
  emptyBody: { fontSize: fontSize.body, color: colors.textMuted, textAlign: "center" },
});
