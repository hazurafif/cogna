import { api } from "./client";

export type SubjectTotal = {
  subject_id: number;
  name: string;
  icon: string;
  minutes: number;
};

export type Summary = {
  total_minutes: number;
  week_minutes: number;
  streak_days: number;
  per_subject: SubjectTotal[];
};

export type TrendPoint = {
  date: string;
  minutes: number;
};

export type Trend = {
  days: number;
  daily: TrendPoint[];
  per_subject: SubjectTotal[];
  total_minutes: number;
  longest_session_minutes: number;
  avg_per_day_minutes: number;
  busiest_hour: number;
};

export function fetchSummary(token: string): Promise<Summary> {
  return api<Summary>("/api/v1/stats/summary", { token });
}

export function fetchTrend(token: string, days = 30): Promise<Trend> {
  return api<Trend>(`/api/v1/stats/trend?days=${days}`, { token });
}
