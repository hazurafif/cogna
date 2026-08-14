import React, { useCallback, useState } from "react";
import { StyleSheet } from "react-native";
import { Clock, CalendarDays } from "lucide-react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useAuth } from "../auth/AuthContext";
import { deleteSession, getSession, StudySession } from "../api/sessions";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Screen } from "../components/Screen";
import { SubjectIcon } from "../components/SubjectIcon";
import { Badge } from "../components/ui/badge";
import { Icon } from "../components/ui/icon";
import { ScrollView } from "../components/ui/scroll-view";
import { Separator } from "../components/ui/separator";
import { Skeleton } from "../components/ui/skeleton";
import { Text } from "../components/ui/text";
import { View } from "../components/ui/view";
import { useColor } from "../hooks/useColor";
import { appFonts } from "../theme/fonts";
import { fontSize, radius, spacing } from "../theme/tokens";
import { formatDuration } from "../utils/time";

export function SessionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  const [session, setSession] = useState<StudySession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const accentColor = useColor("accent");
  const cardColor = useColor("card");
  const borderColor = useColor("border");
  const iconColor = useColor("icon");
  const dangerColor = useColor("error");

  const refresh = useCallback(async () => {
    if (!token || !id) return;
    setLoading(true);
    try {
      setSession(await getSession(token, Number(id)));
      setError(null);
    } catch {
      setError("Could not load session.");
    } finally {
      setLoading(false);
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

  if (loading) {
    return (
      <Screen>
        <Skeleton height={180} variant="rounded" />
        <Skeleton height={60} variant="rounded" />
        <Skeleton height={120} variant="rounded" />
      </Screen>
    );
  }

  if (!session) {
    return (
      <Screen>
        {error ? <Text style={[styles.error, { color: dangerColor }]}>{error}</Text> : null}
      </Screen>
    );
  }

  return (
    <Screen>
      {error ? <Text style={[styles.error, { color: dangerColor }]}>{error}</Text> : null}
      <ScrollView contentContainerStyle={styles.content}>
        <Card>
          <View style={styles.hero}>
            <View style={[styles.heroGlow, { backgroundColor: accentColor }]} />
            <View style={styles.subjectRow}>
              <SubjectIcon name={session.subject_icon} size={16} />
              <Text style={styles.subjectName}>{session.subject_name}</Text>
              <Badge
                variant="secondary"
                textStyle={{ ...styles.sourceBadge, color: iconColor }}
              >
                {session.source}
              </Badge>
            </View>
            <Text style={styles.duration}>{formatDuration(session.duration_minutes)}</Text>
            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Icon name={CalendarDays} size={13} strokeWidth={2.2} color={iconColor} />
                <Text style={[styles.meta, { color: iconColor }]}>{session.started_at}</Text>
              </View>
              <View style={styles.metaItem}>
                <Icon name={Clock} size={13} strokeWidth={2.2} color={iconColor} />
                <Text style={[styles.meta, { color: iconColor }]}>{session.duration_minutes} minutes</Text>
              </View>
            </View>
          </View>
        </Card>
        {session.note ? (
          <Text style={[styles.note, { backgroundColor: cardColor, borderColor }]}>
            {session.note}
          </Text>
        ) : null}
        <Separator style={styles.separator} />
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
  },
  subjectRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  subjectName: { fontSize: fontSize.title, fontFamily: appFonts.bold },
  sourceBadge: {
    fontSize: fontSize.caption,
    fontFamily: appFonts.bold,
    textTransform: "capitalize",
  },
  duration: {
    fontSize: 40,
    fontFamily: appFonts.extraBold,
    letterSpacing: -1.5,
    fontVariant: ["tabular-nums"],
  },
  metaRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: spacing.md, marginTop: 4 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  meta: { fontSize: fontSize.caption },
  note: {
    fontSize: fontSize.body,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginTop: spacing.sm,
  },
  separator: { marginTop: spacing.lg },
  actions: { gap: spacing.md, marginTop: spacing.md },
  error: { fontSize: fontSize.body },
});
