import React, { useEffect, useRef, useState } from "react";
import { StyleSheet } from "react-native";
import { CircleStop, CirclePlay } from "lucide-react-native";
import { router } from "expo-router";
import { useAuth } from "../auth/AuthContext";
import { listSubjects, Subject } from "../api/subjects";
import { createSession } from "../api/sessions";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Chip } from "../components/Chip";
import { Screen } from "../components/Screen";
import { subjectLabel } from "../constants/subjectIcons";
import { ProgressRingChart } from "../components/charts/progress-ring-chart";
import { Icon } from "../components/ui/icon";
import { ScrollView } from "../components/ui/scroll-view";
import { Skeleton } from "../components/ui/skeleton";
import { Text } from "../components/ui/text";
import { View } from "../components/ui/view";
import { useToast } from "../components/ui/toast";
import { useColor } from "../hooks/useColor";
import { appFonts } from "../theme/fonts";
import { fontSize, spacing } from "../theme/tokens";
import { localISO } from "../utils/time";
import { hapticLight, hapticSuccess } from "../utils/haptics";

const RING_SIZE = 240;
const RING_STROKE = 10;

function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(h)}:${p(m)}:${p(s)}`;
}

export function RecordScreen() {
  const { token } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const navigationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const ringColor = useColor("primary");
  const dangerColor = useColor("error");
  const iconColor = useColor("icon");
  const textColor = useColor("text");

  useEffect(() => {
    if (!token) return;
    listSubjects(token)
      .then(setSubjects)
      .catch(() => setError("Could not load subjects."))
      .finally(() => setLoadingSubjects(false));
  }, [token]);

  useEffect(() => {
    if (startedAt === null) return;
    intervalRef.current = setInterval(
      () => setElapsed(Date.now() - startedAt),
      1000,
    );
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [startedAt]);

  useEffect(() => {
    return () => {
      if (navigationTimerRef.current) clearTimeout(navigationTimerRef.current);
    };
  }, []);

  const start = () => {
    if (subjectId === null) return;
    setElapsed(0);
    setStartedAt(Date.now());
    hapticLight();
  };

  const stop = async () => {
    if (startedAt === null || subjectId === null || !token) return;
    if (intervalRef.current) clearInterval(intervalRef.current);
    setSaving(true);
    setError(null);
    try {
      await createSession(token, {
        subject_id: subjectId,
        started_at: localISO(new Date(startedAt)),
        ended_at: localISO(new Date()),
        source: "timer",
      });
      setStartedAt(null);
      setSaving(false);
      hapticSuccess();
      toastSuccess("Session saved!", "Your streak keeps burning.");
      navigationTimerRef.current = setTimeout(() => {
        router.navigate("/");
      }, 1400);
    } catch {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(
        () => setElapsed(Date.now() - startedAt),
        1000,
      );
      toastError("Could not save session. Try again.");
      setSaving(false);
    }
  };

  const running = startedAt !== null;
  const ringProgress =
    running ? ((elapsed % (60 * 60 * 1000)) / (60 * 60 * 1000)) * 100 : 0;

  return (
    <Screen title="Record">
      {error ? <Text style={[styles.error, { color: dangerColor }]}>{error}</Text> : null}
      <ScrollView contentContainerStyle={styles.content}>
        {loadingSubjects ? (
          <View style={styles.subjectRow}>
            <Skeleton width={90} height={40} variant="rounded" />
            <Skeleton width={90} height={40} variant="rounded" />
            <Skeleton width={90} height={40} variant="rounded" />
          </View>
        ) : (
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
        )}

        <Card>
          <View style={styles.ringWrap}>
            <ProgressRingChart
              progress={ringProgress}
              size={RING_SIZE}
              strokeWidth={RING_STROKE}
              config={{ animated: false }}
              showLabel={false}
            />
            <View style={styles.ringInner}>
              <Icon
                name={running ? CircleStop : CirclePlay}
                size={40}
                strokeWidth={1.8}
                color={ringColor}
              />
              <Text
                style={[
                  styles.elapsed,
                  { color: running ? textColor : iconColor },
                ]}
                testID="elapsed"
              >
                {running ? formatElapsed(elapsed) : "00:00:00"}
              </Text>
              <Text style={[styles.runningLabel, { color: iconColor }]}>
                {running
                  ? `${subjectLabel(subjects.find((s) => s.id === subjectId)?.name ?? "")} · timer running`
                  : "Pick a subject to begin"}
              </Text>
            </View>
          </View>
        </Card>

        <View style={styles.actions}>
          <Button
            title={startedAt === null ? "Start studying" : "Running…"}
            onPress={start}
            disabled={subjectId === null || startedAt !== null}
            testID="start-button"
          />
          {startedAt !== null ? (
            <Button
              title="Stop and save"
              variant="danger"
              onPress={stop}
              loading={saving}
              testID="stop-button"
            />
          ) : null}
          <Button
            title="Log without timer"
            variant="outline"
            onPress={() => router.push("/session/new")}
            testID="manual-button"
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg, paddingBottom: spacing.xl, alignItems: "center" },
  subjectRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "center",
  },
  ringWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  ringInner: {
    position: "absolute",
    alignItems: "center",
    gap: spacing.xs,
  },
  elapsed: {
    fontSize: 38,
    fontFamily: appFonts.extraBold,
    letterSpacing: -1,
    fontVariant: ["tabular-nums"],
  },
  runningLabel: { fontSize: fontSize.caption },
  actions: { gap: spacing.md, marginTop: spacing.sm, width: "100%" },
  error: { fontSize: fontSize.body },
});
