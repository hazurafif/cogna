import * as Notifications from "expo-notifications";

export type ReminderConfig = {
  enabled: boolean;
  time: string; // "HH:MM"
};

export const STREAK_PROTECTION_THRESHOLD = 7;

// The main reminder fires at the configured time; when the user is on a long
// streak, a second nudge fires two hours later ("streak protection").
const PROTECTION_DELAY_HOURS = 2;

export function setupNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

function parseClock(time: string): { hour: number; minute: number } {
  const [hour, minute] = time.split(":").map(Number);
  return { hour: hour || 0, minute: minute || 0 };
}

function scheduleDaily(hour: number, minute: number, title: string, body: string): Promise<string> {
  return Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
}

/**
 * Reconciles scheduled notifications with the user's reminder settings.
 * Cancels everything, then schedules the daily reminder (and a streak
 * protection follow-up when the current streak is long enough).
 */
export async function syncReminders(config: ReminderConfig, streakDays: number): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!config.enabled) return;

  const { granted } = await Notifications.requestPermissionsAsync();
  if (!granted) return;

  const { hour, minute } = parseClock(config.time);
  await scheduleDaily(hour, minute, "Cogna", "Time to study — your streak is waiting.");

  if (streakDays >= STREAK_PROTECTION_THRESHOLD) {
    const protectionHour = (hour + PROTECTION_DELAY_HOURS) % 24;
    await scheduleDaily(
      protectionHour,
      minute,
      "Cogna",
      "Still haven't studied today? Keep the streak alive!",
    );
  }
}
