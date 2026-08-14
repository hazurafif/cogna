import { api } from "./client";

export type ChallengeProgress = {
  challenge: {
    code: string;
    name: string;
    description: string;
    target: number;
    unit: string;
  };
  value: number;
  completed: boolean;
  days_left: number;
};

export function fetchCurrentChallenge(token: string): Promise<ChallengeProgress> {
  return api<ChallengeProgress>("/api/v1/challenges/current", { token });
}
