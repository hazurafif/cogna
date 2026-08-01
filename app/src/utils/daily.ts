import { StudySession } from "../api/sessions";

export const DAILY_GOAL_MINUTES = 120;

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function dayKey(date: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

export type ActivityDay = {
  date: string;
  weekday: string;
  minutes: number;
  isToday: boolean;
};

export function buildActivityWeek(sessions: StudySession[], now = new Date()): ActivityDay[] {
  const totals = new Map<string, number>();
  for (const s of sessions) {
    const key = dayKey(new Date(s.started_at));
    totals.set(key, (totals.get(key) ?? 0) + s.duration_minutes);
  }

  const days: ActivityDay[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const key = dayKey(d);
    days.push({
      date: key,
      weekday: WEEKDAYS[d.getDay()],
      minutes: totals.get(key) ?? 0,
      isToday: i === 0,
    });
  }
  return days;
}

export function todayMinutes(sessions: StudySession[], now = new Date()): number {
  const key = dayKey(now);
  return sessions.reduce(
    (sum, s) => (dayKey(new Date(s.started_at)) === key ? sum + s.duration_minutes : sum),
    0,
  );
}

export type DayGroup = {
  key: string;
  label: string;
  data: StudySession[];
};

export function formatDayLabel(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return `${WEEKDAYS[date.getDay()]}, ${MONTHS[date.getMonth()]} ${d}`;
}

export function groupSessionsByDay(sessions: StudySession[], now = new Date()): DayGroup[] {
  const groups = new Map<string, StudySession[]>();
  for (const s of sessions) {
    const key = dayKey(new Date(s.started_at));
    const list = groups.get(key) ?? [];
    list.push(s);
    groups.set(key, list);
  }

  const todayKey = dayKey(now);
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const yesterdayKey = dayKey(yesterday);

  return [...groups.entries()]
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .map(([key, data]) => ({
      key,
      label: key === todayKey ? "Today" : key === yesterdayKey ? "Yesterday" : formatDayLabel(key),
      data,
    }));
}

export function streakMilestone(streak: number): string | null {
  if (streak >= 30) return "30-day streak";
  if (streak >= 14) return "14-day streak";
  if (streak >= 7) return "7-day streak";
  if (streak >= 3) return "3-day streak";
  return null;
}

export function streakCopy(streak: number, hasSessions: boolean): string {
  if (streak > 0) return "Keep it alive today";
  if (hasSessions) return "Every streak starts with one session";
  return "Log your first session to start a streak";
}
