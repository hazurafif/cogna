import React, { useCallback, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useAuth } from "../auth/AuthContext";
import { listSessions, StudySession } from "../api/sessions";
import { Screen } from "../components/Screen";
import { colors } from "../theme/colors";
import { fontSize, radius, spacing } from "../theme/tokens";
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
        <Pressable onPress={() => router.push("/session/new")} style={styles.addLink}>
          <Ionicons name="add-outline" size={16} color={colors.primary} />
          <Text style={styles.addText}>Log manually</Text>
        </Pressable>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        data={sessions}
        keyExtractor={(s) => String(s.id)}
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => router.push(`/session/${item.id}`)}>
            <View style={styles.iconChip}>
              <Ionicons name="time-outline" size={18} color={item.subject_color} />
            </View>
            <View style={styles.rowBody}>
              <Text style={styles.rowName}>{item.subject_name}</Text>
              <Text style={styles.rowMeta}>
                {formatDay(item.started_at)} · {item.source}
              </Text>
            </View>
            <Text style={styles.rowDuration}>{formatDuration(item.duration_minutes)}</Text>
          </Pressable>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center" },
  addLink: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  addText: { color: colors.primary, fontWeight: "600", fontSize: fontSize.body },
  iconChip: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowBody: { flex: 1 },
  rowName: { fontSize: fontSize.body, fontWeight: "600", color: colors.text },
  rowMeta: { fontSize: fontSize.caption, color: colors.textSecondary, marginTop: 2 },
  rowDuration: {
    fontSize: fontSize.body,
    fontWeight: "700",
    color: colors.text,
    fontVariant: ["tabular-nums"],
  },
  error: { color: colors.danger, fontSize: fontSize.body },
});
