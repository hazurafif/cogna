import React, { useCallback, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Trash, Plus, Check } from "lucide-react-native";
import { useFocusEffect } from "expo-router";
import { useAuth } from "../auth/AuthContext";
import { createSubject, deleteSubject, listSubjects, Subject } from "../api/subjects";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Screen } from "../components/Screen";
import { SubjectDot } from "../components/SubjectDot";
import { colors } from "../theme/colors";
import { fontSize, radius, spacing } from "../theme/tokens";

export function SubjectsScreen() {
  const { token } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [name, setName] = useState("");
  const [color, setColor] = useState<(typeof colors.subjects)[number]>(colors.subjects[0]);
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
      await createSubject(token, name.trim(), color);
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
        <View style={styles.palette}>
          {colors.subjects.map((c) => (
            <Pressable
              key={c}
              testID={`color-${c}`}
              onPress={() => setColor(c)}
              style={[
                styles.swatch,
                { backgroundColor: c },
                color === c && styles.swatchActive,
              ]}
            >
              {color === c ? <Check size={16} strokeWidth={3} color={colors.white} /> : null}
            </Pressable>
          ))}
        </View>
        <Button title="Add" onPress={onAdd} disabled={!name.trim()} />
      </Card>
      <FlatList
        data={subjects}
        keyExtractor={(s) => String(s.id)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <SubjectDot color={item.color} size={10} />
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
  palette: { flexDirection: "row", gap: spacing.md, marginTop: spacing.md, justifyContent: "space-between" },
  swatch: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  swatchActive: {
    transform: [{ scale: 1.12 }],
    borderWidth: 2,
    borderColor: colors.text,
  },
  list: { gap: spacing.xs, paddingBottom: spacing.xl },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
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
