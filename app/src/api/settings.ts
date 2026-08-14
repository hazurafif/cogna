import { api } from "./client";

export type Settings = {
  daily_goal_minutes: number;
  weekly_goal_minutes: number;
  reminder_enabled: boolean;
  reminder_time: string;
  updated_at: string;
};

export type UpdateSettingsInput = {
  daily_goal_minutes: number;
  weekly_goal_minutes: number;
  reminder_enabled: boolean;
  reminder_time: string;
};

export const DEFAULT_SETTINGS: Settings = {
  daily_goal_minutes: 120,
  weekly_goal_minutes: 840,
  reminder_enabled: false,
  reminder_time: "19:00",
  updated_at: "",
};

export function fetchSettings(token: string): Promise<Settings> {
  return api<Settings>("/api/v1/settings", { token });
}

export function updateSettings(
  token: string,
  input: UpdateSettingsInput,
): Promise<Settings> {
  return api<Settings>("/api/v1/settings", {
    method: "PUT",
    body: input,
    token,
  });
}
