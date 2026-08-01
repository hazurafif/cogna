import React, { useCallback, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Plus, ChevronRight } from "lucide-react-native";
import { router, useFocusEffect } from "expo-router";
import { useAuth } from "../auth/AuthContext";
import { listSessions, StudySession } from "../api/sessions";
import { Screen } from "../components/Screen";
import { colors } from "../theme/colors";
import { fontSize, radius, shadow, spacing } from "../theme/tokens";
import { formatDuration } from "../utils/time";

function formatDay(startedAt: string): string {
  return startedAt.slice(0, 10);
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

  return (
    <Screen title="History">
      <View style={styles.header}>
        <Text style={styles.count}>{sessions.length} sessions</Text>
        <Pressable onPress={() => router.push("/session/new")} style={styles.addLink}>
          <View style={styles.addIcon}>
            <Plus size={14} strokeWidth={3} color={colors.primary} />
          </View>
          <Text style={styles.addText}>Log manually</Text>
        </Pressable>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        data={sessions}
        keyExtractor={(s) => String(s.id)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            onPress={() => router.push(`/session/${item.id}`)}
          >
            <View style={[styles.iconChip, { backgroundColor: `${item.subject_color}22` }]}>
              <View style={[styles.iconDot, { backgroundColor: item.subject_color }]} />
            </View>
            <View style={styles.rowBody}>
              <Text style={styles.rowName}>{item.subject_name}</Text>
              <Text style={styles.rowMeta}>
                {formatDay(item.started_at)} · {item.source}
              </Text>
            </View>
            <Text style={styles.rowDuration}>{formatDuration(item.duration_minutes)}</Text>
            <ChevronRight size={16} strokeWidth={2.2} color={colors.textMuted} />
          </Pressable>
        )}
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
  iconChip: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  iconDot: { width: 14, height: 14, borderRadius: radius.full },
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
});
