import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet } from "react-native";
import { ChevronLeft, Minus, Plus } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../auth/AuthContext";
import { DEFAULT_SETTINGS, fetchSettings, updateSettings } from "../api/settings";
import { Button } from "../components/Button";
import { Chip } from "../components/Chip";
import { Card } from "../components/Card";
import { Screen } from "../components/Screen";
import { Button as BnaButton } from "../components/ui/button";
import { Icon } from "../components/ui/icon";
import { Input } from "../components/ui/input";
import { ScrollView } from "../components/ui/scroll-view";
import { Spinner } from "../components/ui/spinner";
import { Switch } from "../components/ui/switch";
import { Text } from "../components/ui/text";
import { View } from "../components/ui/view";
import { useColor } from "../hooks/useColor";
import { appFonts } from "../theme/fonts";
import { fontSize, radius, spacing } from "../theme/tokens";
import { formatDuration } from "../utils/time";

const DAILY_STEP = 15;
const DAILY_MIN = 15;
const DAILY_MAX = 600;
const WEEKLY_STEP = 60;
const WEEKLY_MIN = 60;
const WEEKLY_MAX = 4200;
const REMINDER_TIMES = ["18:00", "19:00", "20:00", "21:00", "22:00"];

export function SettingsScreen() {
  const router = useRouter();
  const { token, user, updateName } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [daily, setDaily] = useState(DEFAULT_SETTINGS.daily_goal_minutes);
  const [weekly, setWeekly] = useState(DEFAULT_SETTINGS.weekly_goal_minutes);
  const [reminderEnabled, setReminderEnabled] = useState(DEFAULT_SETTINGS.reminder_enabled);
  const [reminderTime, setReminderTime] = useState(DEFAULT_SETTINGS.reminder_time);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const primaryColor = useColor("primary");
  const mutedColor = useColor("textMuted");
  const iconColor = useColor("icon");
  const textColor = useColor("text");
  const dangerColor = useColor("error");
  const borderColor = useColor("border");
  const surfaceColor = useColor("secondary");

  useEffect(() => {
    if (!token) return;
    fetchSettings(token)
      .then((settings) => {
        setDaily(settings.daily_goal_minutes);
        setWeekly(settings.weekly_goal_minutes);
        setReminderEnabled(settings.reminder_enabled);
        setReminderTime(settings.reminder_time);
        setLoading(false);
      })
      .catch(() => {
        setError("Could not load settings.");
        setLoading(false);
      });
  }, [token]);

  const save = async () => {
    if (!token) return;
    setSaving(true);
    setError(null);
    try {
      await updateSettings(token, {
        daily_goal_minutes: daily,
        weekly_goal_minutes: weekly,
        reminder_enabled: reminderEnabled,
        reminder_time: reminderTime,
      });
      if (name.trim() !== (user?.name ?? "")) {
        await updateName(name.trim());
      }
      router.back();
    } catch {
      setError("Could not save settings. Try again.");
      setSaving(false);
    }
  };

  return (
    <Screen title="Settings">
      <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backBtn} testID="back-button">
        <Icon name={ChevronLeft} size={20} strokeWidth={2.2} color={iconColor} />
        <Text style={[styles.backLabel, { color: iconColor }]}>Back</Text>
      </Pressable>
      {error ? <Text style={[styles.error, { color: dangerColor }]}>{error}</Text> : null}
      {loading ? (
        <View style={styles.loading}>
          <Spinner color={primaryColor} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Card>
            <Text style={styles.label}>Display name</Text>
            <Input
              variant="filled"
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor={mutedColor}
              maxLength={50}
              testID="name-input"
            />
            <Text style={[styles.hint, { color: mutedColor }]}>
              Shown on your profile and home screen.
            </Text>
          </Card>

          <Card>
            <View style={styles.goalHeader}>
              <View style={styles.goalTitleBlock}>
                <Text style={styles.label}>Daily goal</Text>
                <Text style={[styles.hint, { color: mutedColor }]}>
                  How long you aim to study each day.
                </Text>
              </View>
              <Stepper
                value={daily}
                onChange={setDaily}
                min={DAILY_MIN}
                max={DAILY_MAX}
                stepBy={DAILY_STEP}
                testID="daily-goal"
                textColor={textColor}
                surfaceColor={surfaceColor}
                borderColor={borderColor}
              />
            </View>
            <Text style={styles.goalValue}>{formatDuration(daily)} per day</Text>
          </Card>

          <Card>
            <View style={styles.goalHeader}>
              <View style={styles.goalTitleBlock}>
                <Text style={styles.label}>Weekly goal</Text>
                <Text style={[styles.hint, { color: mutedColor }]}>
                  Your target for the whole week.
                </Text>
              </View>
              <Stepper
                value={weekly}
                onChange={setWeekly}
                min={WEEKLY_MIN}
                max={WEEKLY_MAX}
                stepBy={WEEKLY_STEP}
                testID="weekly-goal"
                textColor={textColor}
                surfaceColor={surfaceColor}
                borderColor={borderColor}
              />
            </View>
            <Text style={styles.goalValue}>{formatDuration(weekly)} per week</Text>
          </Card>

          <Card>
            <View style={styles.goalHeader}>
              <View style={styles.goalTitleBlock}>
                <Text style={styles.label}>Daily reminder</Text>
                <Text style={[styles.hint, { color: mutedColor }]}>
                  A nudge to keep your streak alive. With a 7+ day streak you get a second one
                  two hours later.
                </Text>
              </View>
              <Switch
                value={reminderEnabled}
                onValueChange={setReminderEnabled}
                haptic={false}
                testID="reminder-switch"
              />
            </View>
            {reminderEnabled ? (
              <View style={styles.timeRow} testID="reminder-times">
                {REMINDER_TIMES.map((t) => (
                  <Chip
                    key={t}
                    label={t}
                    selected={reminderTime === t}
                    onPress={() => setReminderTime(t)}
                    testID={`reminder-time-${t}`}
                  />
                ))}
              </View>
            ) : null}
          </Card>

          <Button
            title="Save settings"
            onPress={save}
            loading={saving}
            testID="save-settings-button"
          />
        </ScrollView>
      )}
    </Screen>
  );
}

type StepperProps = {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  stepBy: number;
  testID: string;
  textColor: string;
  surfaceColor: string;
  borderColor: string;
};

function Stepper({
  value,
  onChange,
  min,
  max,
  stepBy,
  testID,
  textColor,
  surfaceColor,
  borderColor,
}: StepperProps) {
  return (
    <View style={styles.stepper}>
      <BnaButton
        variant="secondary"
        size="icon"
        icon={Minus}
        label="Decrease"
        onPress={() => onChange(Math.max(min, value - stepBy))}
        disabled={value <= min}
        haptic={false}
        testID={`${testID}-minus`}
        style={[styles.stepBtn, { backgroundColor: surfaceColor, borderColor }]}
        textStyle={{ color: textColor }}
      />
      <Text style={styles.stepValue} testID={`${testID}-value`}>
        {value}
      </Text>
      <BnaButton
        variant="secondary"
        size="icon"
        icon={Plus}
        label="Increase"
        onPress={() => onChange(Math.min(max, value + stepBy))}
        disabled={value >= max}
        haptic={false}
        testID={`${testID}-plus`}
        style={[styles.stepBtn, { backgroundColor: surfaceColor, borderColor }]}
        textStyle={{ color: textColor }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  backBtn: { flexDirection: "row", alignItems: "center", gap: spacing.xs, alignSelf: "flex-start" },
  backLabel: { fontSize: fontSize.body, fontFamily: appFonts.semibold },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { gap: spacing.lg, paddingBottom: spacing.xl },
  label: { fontSize: fontSize.body, fontFamily: appFonts.bold },
  hint: { fontSize: fontSize.caption },
  goalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.md },
  goalTitleBlock: { flex: 1 },
  timeRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  goalValue: { fontSize: fontSize.title, fontFamily: appFonts.extraBold, fontVariant: ["tabular-nums"] },
  stepper: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  stepBtn: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  stepValue: {
    minWidth: 40,
    textAlign: "center",
    fontSize: fontSize.title,
    fontFamily: appFonts.extraBold,
    fontVariant: ["tabular-nums"],
  },
  error: { fontSize: fontSize.body },
});
