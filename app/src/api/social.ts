import { api } from "./client";
import { StudySession } from "./sessions";

export type PublicUser = {
  id: number;
  email: string;
  name: string;
  created_at: string;
};

export type UserFollow = PublicUser & {
  is_following: boolean;
  weekly_minutes: number;
};

export type FeedItem = {
  session: StudySession;
  user: PublicUser;
  kudos_count: number;
  kudos_by_me: boolean;
};

export type LeaderboardEntry = PublicUser & {
  minutes: number;
  is_self: boolean;
};

export function searchUsers(token: string, q: string): Promise<{ users: UserFollow[] }> {
  return api<{ users: UserFollow[] }>(`/api/v1/users/search?q=${encodeURIComponent(q)}`, {
    token,
  });
}

export function followUser(token: string, userId: number): Promise<{ following: boolean }> {
  return api<{ following: boolean }>(`/api/v1/users/${userId}/follow`, {
    method: "POST",
    token,
  });
}

export function unfollowUser(token: string, userId: number): Promise<{ following: boolean }> {
  return api<{ following: boolean }>(`/api/v1/users/${userId}/follow`, {
    method: "DELETE",
    token,
  });
}

export function fetchFollowing(token: string): Promise<{ following: UserFollow[] }> {
  return api<{ following: UserFollow[] }>("/api/v1/follows", { token });
}

export function fetchFeed(token: string): Promise<{ items: FeedItem[] }> {
  return api<{ items: FeedItem[] }>("/api/v1/feed", { token });
}

export function addKudos(token: string, sessionId: number): Promise<{ kudos: boolean }> {
  return api<{ kudos: boolean }>(`/api/v1/sessions/${sessionId}/kudos`, {
    method: "POST",
    token,
  });
}

export function removeKudos(token: string, sessionId: number): Promise<{ kudos: boolean }> {
  return api<{ kudos: boolean }>(`/api/v1/sessions/${sessionId}/kudos`, {
    method: "DELETE",
    token,
  });
}

export function fetchLeaderboard(token: string): Promise<{ entries: LeaderboardEntry[] }> {
  return api<{ entries: LeaderboardEntry[] }>("/api/v1/leaderboard", { token });
}
