import { api } from "./client";

export type Achievement = {
  code: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlocked_at: string | null;
};

export type AchievementCatalog = {
  achievements: Achievement[];
};

export function fetchAchievements(token: string): Promise<AchievementCatalog> {
  return api<AchievementCatalog>("/api/v1/achievements", { token });
}
