import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { CalendarDays, Timer, PencilLine } from "lucide-react-native";
import { router, useLocalSearchParams } from "expo-router";
import { TextInput, Text } from "react-native-paper";
import { useAuth } from "../auth/AuthContext";
import { listSubjects, Subject } from "../api/subjects";
import { createSession, getSession, updateSession } from "../api/sessions";
import { Button } from "../components/Button";
import { Chip } from "../components/Chip";
import { Screen } from "../components/Screen";
import { subjectLabel } from "../constants/subjectIcons";
import { colors } from "../theme/colors";
import { appFonts } from "../theme/fonts";
import { fontSize, spacing } from "../theme/tokens";
import { localISO, todayDate } from "../utils/time";

const QUICK_MINUTES = [15, 25, 45, 60];

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
    const mins = Number(minutes);
    if (!Number.isInteger(mins) || mins <= 0) {
      setError("Minutes must be a positive whole number.");
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
    <Screen title={isEdit ? "Edit session" : "Log a session"}>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.fieldLabel}>Subject</Text>
        <View style={styles.subjectRow}>
          {subjects.map((s) => (
            <Chip
              key={s.id}
              label={subjectLabel(s.name)}
              selected={subjectId === s.id}
              onPress={() => setSubjectId(s.id)}
            />
          ))}
        </View>
        <Text style={styles.fieldLabel}>Duration</Text>
        <View style={styles.subjectRow}>
          {QUICK_MINUTES.map((m) => (
            <Chip
              key={m}
              label={`${m}m`}
              selected={minutes === String(m)}
              onPress={() => setMinutes(String(m))}
            />
          ))}
        </View>
        <TextInput
          mode="outlined"
          placeholder="Date (YYYY-MM-DD)"
          placeholderTextColor={colors.textMuted}
          value={date}
          onChangeText={setDate}
          left={
            <TextInput.Icon
              icon={({ size, color }) => <CalendarDays size={size} strokeWidth={2.2} color={color} />}
            />
          }
        />
        <TextInput
          mode="outlined"
          placeholder="Minutes"
          placeholderTextColor={colors.textMuted}
          value={minutes}
          onChangeText={setMinutes}
          keyboardType="number-pad"
          left={
            <TextInput.Icon
              icon={({ size, color }) => <Timer size={size} strokeWidth={2.2} color={color} />}
            />
          }
        />
        <TextInput
          mode="outlined"
          placeholder="Note (optional)"
          placeholderTextColor={colors.textMuted}
          value={note}
          onChangeText={setNote}
          left={
            <TextInput.Icon
              icon={({ size, color }) => <PencilLine size={size} strokeWidth={2.2} color={color} />}
            />
          }
        />
        <Button
          title="Save session"
          onPress={onSave}
          disabled={subjectId === null}
          loading={saving}
          testID="save-button"
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, paddingBottom: spacing.xl },
  fieldLabel: {
    fontSize: fontSize.caption,
    fontFamily: appFonts.bold,
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginTop: spacing.sm,
  },
  subjectRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  error: { color: colors.danger, fontSize: fontSize.body },
});
