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

export function startOfWeek(now = new Date()): Date {
  const day = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const offset = (day.getDay() + 6) % 7; // Monday = 0
  return new Date(day.getFullYear(), day.getMonth(), day.getDate() - offset);
}

function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

export function weekMinutes(sessions: StudySession[], now = new Date()): number {
  const start = startOfWeek(now);
  const startKey = dayKey(start);
  const endKey = dayKey(new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7));
  return sessions.reduce(
    (sum, s) => {
      const key = dayKey(new Date(s.started_at));
      return key >= startKey && key < endKey ? sum + s.duration_minutes : sum;
    },
    0,
  );
}

export function goalDaysThisWeek(sessions: StudySession[], now = new Date()): number {
  const start = startOfWeek(now);
  const startKey = dayKey(start);
  const endKey = dayKey(new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7));
  const perDay = new Map<string, number>();
  for (const s of sessions) {
    const key = dayKey(new Date(s.started_at));
    if (key >= startKey && key < endKey) {
      perDay.set(key, (perDay.get(key) ?? 0) + s.duration_minutes);
    }
  }
  let met = 0;
  for (const minutes of perDay.values()) {
    if (minutes >= DAILY_GOAL_MINUTES) met++;
  }
  return met;
}

export function minutesPerDay(sessions: StudySession[]): Map<string, number> {
  const totals = new Map<string, number>();
  for (const s of sessions) {
    const key = dayKey(new Date(s.started_at));
    totals.set(key, (totals.get(key) ?? 0) + s.duration_minutes);
  }
  return totals;
}

export function bestStreak(sessions: StudySession[]): number {
  const days = [...new Set(sessions.map((s) => dayKey(new Date(s.started_at))))].sort();
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const key of days) {
    run = prev !== null && daysBetween(prev, key) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = key;
  }
  return best;
}

export type WeekTotal = {
  weekStart: string;
  minutes: number;
};

export function weeklyTotals(sessions: StudySession[], weeks: number, now = new Date()): WeekTotal[] {
  const totals = minutesPerDay(sessions);
  const start = startOfWeek(now);
  const out: WeekTotal[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const ws = new Date(start.getFullYear(), start.getMonth(), start.getDate() - 7 * i);
    const wsKey = dayKey(ws);
    const weKey = dayKey(new Date(ws.getFullYear(), ws.getMonth(), ws.getDate() + 7));
    let minutes = 0;
    for (const [key, m] of totals) {
      if (key >= wsKey && key < weKey) minutes += m;
    }
    out.push({ weekStart: wsKey, minutes });
  }
  return out;
}

export function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export type HeatmapCell = {
  key: string;
  minutes: number;
} | null;

export function monthHeatmap(year: number, month: number, totals: Map<string, number>): HeatmapCell[][] {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = (new Date(year, month, 1).getDay() + 6) % 7; // Monday = 0
  const cells: (HeatmapCell)[] = Array.from({ length: startOffset }, () => null);
  for (let d = 1; d <= daysInMonth; d++) {
    const key = dayKey(new Date(year, month, d));
    cells.push({ key, minutes: totals.get(key) ?? 0 });
  }
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: HeatmapCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
}

export function heatIntensity(minutes: number): 0 | 1 | 2 | 3 | 4 {
  if (minutes <= 0) return 0;
  if (minutes < 30) return 1;
  if (minutes < 60) return 2;
  if (minutes < 120) return 3;
  return 4;
}
