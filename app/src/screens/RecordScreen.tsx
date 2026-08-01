import React, { useEffect, useRef, useState } from "react";
import { Animated, ScrollView, StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { CircleStop, CirclePlay, Flame } from "lucide-react-native";
import { router } from "expo-router";
import { useAuth } from "../auth/AuthContext";
import { listSubjects, Subject } from "../api/subjects";
import { createSession } from "../api/sessions";
import { Button } from "../components/Button";
import { Chip } from "../components/Chip";
import { Screen } from "../components/Screen";
import { subjectLabel } from "../constants/subjectIcons";
import { colors } from "../theme/colors";
import { fontSize, radius, spacing } from "../theme/tokens";
import { localISO } from "../utils/time";
import { hapticLight, hapticSuccess } from "../utils/haptics";

const RING_SIZE = 240;
const RING_STROKE = 10;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

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
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [saving, setSaving] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const celebrationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pulse] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!token) return;
    listSubjects(token)
      .then(setSubjects)
      .catch(() => setError("Could not load subjects."));
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
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: false }),
        Animated.timing(pulse, { toValue: 0, duration: 900, useNativeDriver: false }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  useEffect(() => {
    if (!celebrating) return;
    celebrationTimerRef.current = setTimeout(() => {
      setCelebrating(false);
      router.navigate("/");
    }, 1400);
    return () => {
      if (celebrationTimerRef.current) clearTimeout(celebrationTimerRef.current);
    };
  }, [celebrating]);

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
      setCelebrating(true);
    } catch {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(
        () => setElapsed(Date.now() - startedAt),
        1000,
      );
      setError("Could not save session. Try again.");
      setSaving(false);
    }
  };

  const running = startedAt !== null;
  const ringColor = colors.primary;
  const ringProgress =
    running ? (elapsed % (60 * 60 * 1000)) / (60 * 60 * 1000) : 0;
  const ringDash = RING_CIRCUMFERENCE * (1 - ringProgress);
  const pulseScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] });
  const pulseOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0, 0.5] });
  const celebrationScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.15] });

  return (
    <Screen title="Record">
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <ScrollView contentContainerStyle={styles.content}>
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

        <View style={styles.ringWrap}>
          {running ? (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.pulseGlow,
                {
                  backgroundColor: ringColor,
                  transform: [{ scale: pulseScale }],
                  opacity: pulseOpacity,
                },
              ]}
            />
          ) : null}
          <Svg width={RING_SIZE} height={RING_SIZE}>
            <Circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_RADIUS}
              stroke={colors.surfaceElevated}
              strokeWidth={RING_STROKE}
              fill="none"
            />
            {running ? (
              <Circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RING_RADIUS}
                stroke={ringColor}
                strokeWidth={RING_STROKE}
                strokeLinecap="round"
                strokeDasharray={`${RING_CIRCUMFERENCE} ${RING_CIRCUMFERENCE}`}
                strokeDashoffset={ringDash}
                fill="none"
                transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
              />
            ) : null}
          </Svg>
          <View style={styles.ringInner}>
            {running ? (
              <CircleStop size={40} strokeWidth={1.8} color={ringColor} />
            ) : (
              <CirclePlay size={40} strokeWidth={1.8} color={ringColor} />
            )}
            <Text style={[styles.elapsed, !running && styles.elapsedIdle]} testID="elapsed">
              {running ? formatElapsed(elapsed) : "00:00:00"}
            </Text>
            <Text style={styles.runningLabel}>
              {running
                ? `${subjectLabel(subjects.find((s) => s.id === subjectId)?.name ?? "")} · timer running`
                : "Pick a subject to begin"}
            </Text>
          </View>
        </View>

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

      {celebrating ? (
        <View style={styles.celebrationOverlay} pointerEvents="none">
          <Animated.View
            style={[styles.celebrationIcon, { transform: [{ scale: celebrationScale }] }]}
          >
            <Flame size={56} strokeWidth={2} color={colors.primary} />
          </Animated.View>
          <Text style={styles.celebrationTitle}>Session saved!</Text>
          <Text style={styles.celebrationSub}>Your streak keeps burning.</Text>
        </View>
      ) : null}
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
    marginTop: spacing.md,
    alignItems: "center",
    justifyContent: "center",
  },
  pulseGlow: {
    position: "absolute",
    width: RING_SIZE - 12,
    height: RING_SIZE - 12,
    borderRadius: (RING_SIZE - 12) / 2,
  },
  ringInner: {
    position: "absolute",
    alignItems: "center",
    gap: spacing.xs,
  },
  elapsed: {
    fontSize: 38,
    fontWeight: "800",
    letterSpacing: -1,
    color: colors.text,
    fontVariant: ["tabular-nums"],
  },
  elapsedIdle: { color: colors.textSecondary },
  runningLabel: { color: colors.textSecondary, fontSize: fontSize.caption },
  actions: { gap: spacing.md, marginTop: spacing.sm, width: "100%" },
  error: { color: colors.danger, fontSize: fontSize.body },
  celebrationOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(11, 14, 20, 0.92)",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
  },
  celebrationIcon: {
    width: 96,
    height: 96,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  celebrationTitle: { fontSize: fontSize.heading, fontWeight: "800", color: colors.text },
  celebrationSub: { fontSize: fontSize.body, color: colors.textSecondary },
});
