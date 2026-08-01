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

export function fetchSummary(token: string): Promise<Summary> {
  return api<Summary>("/api/v1/stats/summary", { token });
}
