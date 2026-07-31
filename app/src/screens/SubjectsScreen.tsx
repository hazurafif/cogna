import React, { useCallback, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { useAuth } from "../auth/AuthContext";
import { createSubject, deleteSubject, listSubjects, Subject } from "../api/subjects";

const PALETTE = ["#4F46E5", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#06B6D4"];

export function SubjectsScreen() {
  const { token } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [name, setName] = useState("");
  const [color, setColor] = useState(PALETTE[0]);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      setSubjects(await listSubjects(token));
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
    <View style={styles.container}>
      <Text style={styles.title}>Subjects</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Subject name"
          value={name}
          onChangeText={setName}
        />
        <View style={styles.palette}>
          {PALETTE.map((c) => (
            <Pressable
              key={c}
              testID={`color-${c}`}
              onPress={() => setColor(c)}
              style={[styles.swatch, { backgroundColor: c }, color === c && styles.swatchActive]}
            />
          ))}
        </View>
        <Pressable style={styles.addButton} onPress={onAdd}>
          <Text style={styles.addButtonText}>Add</Text>
        </Pressable>
      </View>
      <FlatList
        data={subjects}
        keyExtractor={(s) => String(s.id)}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={[styles.dot, { backgroundColor: item.color }]} />
            <Text style={styles.rowName}>{item.name}</Text>
            <Pressable onPress={() => onDelete(item.id)}>
              <Text style={styles.delete}>Delete</Text>
            </Pressable>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  title: { fontSize: 24, fontWeight: "700" },
  form: { gap: 12 },
  input: { borderWidth: 1, borderColor: "#d1d5db", borderRadius: 8, padding: 12, fontSize: 16 },
  palette: { flexDirection: "row", gap: 8 },
  swatch: { width: 32, height: 32, borderRadius: 16 },
  swatchActive: { borderWidth: 3, borderColor: "#111827" },
  addButton: {
    backgroundColor: "#4F46E5", borderRadius: 8, padding: 12, alignItems: "center",
  },
  addButtonText: { color: "#fff", fontWeight: "600" },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 },
  dot: { width: 14, height: 14, borderRadius: 7 },
  rowName: { flex: 1, fontSize: 16 },
  delete: { color: "#dc2626" },
  error: { color: "#dc2626" },
});
