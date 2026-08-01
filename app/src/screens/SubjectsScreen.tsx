import React, { useCallback, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Trash, Plus, Check, Library } from "lucide-react-native";
import { useFocusEffect } from "expo-router";
import { useAuth } from "../auth/AuthContext";
import { createSubject, deleteSubject, listSubjects, Subject } from "../api/subjects";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Screen } from "../components/Screen";
import { SubjectIcon } from "../components/SubjectIcon";
import { SUBJECT_ICONS, SubjectIconName, subjectIcon } from "../constants/subjectIcons";
import { colors } from "../theme/colors";
import { fontSize, radius, spacing } from "../theme/tokens";

export function SubjectsScreen() {
  const { token } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState<SubjectIconName>(SUBJECT_ICONS[0]);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      setSubjects(await listSubjects(token));
      setError(null);
    } catch {
      setError("Could not load subjects.");
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const onAdd = async () => {
    if (!token || !name.trim()) return;
    setError(null);
    try {
      await createSubject(token, name.trim(), icon);
      setName("");
      refresh();
    } catch {
      setError("Could not add subject.");
    }
  };

  const onDelete = async (id: number) => {
    if (!token) return;
    setError(null);
    try {
      await deleteSubject(token, id);
      refresh();
    } catch {
      setError("Could not delete subject (it may have sessions).");
    }
  };

  return (
    <Screen title="Subjects">
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Card>
        <View style={styles.inputWrap}>
          <View style={styles.inputIcon}>
            <Plus size={16} strokeWidth={2.5} color={colors.textMuted} />
          </View>
          <TextInput
            style={styles.input}
            placeholder="Subject name"
            placeholderTextColor={colors.textMuted}
            value={name}
            onChangeText={setName}
          />
        </View>
        <Text style={styles.fieldLabel}>Icon</Text>
        <View style={styles.iconGrid}>
          {SUBJECT_ICONS.map((name) => {
            const Icon = subjectIcon(name);
            const active = icon === name;
            return (
              <Pressable
                key={name}
                testID={`icon-${name}`}
                accessibilityLabel={`Icon ${name}`}
                onPress={() => setIcon(name)}
                style={[styles.iconSlot, active && styles.iconSlotActive]}
              >
                <Icon
                  size={18}
                  strokeWidth={2.2}
                  color={active ? colors.primary : colors.textSecondary}
                />
              </Pressable>
            );
          })}
        </View>
        <Button title="Add" onPress={onAdd} disabled={!name.trim()} />
      </Card>
      {subjects.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Library size={26} strokeWidth={2} color={colors.textMuted} />
          </View>
          <Text style={styles.emptyTitle}>No subjects yet</Text>
          <Text style={styles.emptyBody}>
            Add a subject above, then pick it when you start the timer.
          </Text>
        </View>
      ) : null}
      <FlatList
        data={subjects}
        keyExtractor={(s) => String(s.id)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.rowIcon}>
              <SubjectIcon name={item.icon} size={16} />
            </View>
            <Text style={styles.rowName}>{item.name}</Text>
            <Pressable
              testID={`delete-${item.id}`}
              accessibilityLabel={`Delete ${item.name}`}
              onPress={() => onDelete(item.id)}
              hitSlop={10}
              style={styles.deleteBtn}
            >
              <Trash size={16} strokeWidth={2.2} color={colors.danger} />
            </Pressable>
          </View>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
  },
  inputIcon: { opacity: 0.8 },
  input: {
    flex: 1,
    paddingVertical: spacing.md,
    fontSize: fontSize.body,
    color: colors.text,
  },
  fieldLabel: {
    fontSize: fontSize.caption,
    fontWeight: "700",
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginTop: spacing.md,
  },
  iconGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  iconSlot: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  iconSlotActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  list: { gap: spacing.xs, paddingBottom: spacing.xl },
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
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  rowName: { flex: 1, fontSize: fontSize.body, fontWeight: "600", color: colors.text },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: "rgba(248, 113, 113, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  error: { color: colors.danger, fontSize: fontSize.body },
});
