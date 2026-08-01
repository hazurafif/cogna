import { api } from "./client";

export type StudySession = {
  id: number;
  user_id: number;
  subject_id: number;
  subject_name: string;
  subject_icon: string;
  started_at: string;
  ended_at: string;
  duration_minutes: number;
  source: "timer" | "manual";
  note: string | null;
  created_at: string;
};

export type CreateSessionInput = {
  subject_id: number;
  started_at: string;
  ended_at: string;
  source: "timer" | "manual";
  note?: string | null;
};

export function listSessions(
  token: string,
  params: { from?: string; to?: string; subject_id?: number } = {},
): Promise<StudySession[]> {
  const qs = new URLSearchParams();
  if (params.from) qs.set("from", params.from);
  if (params.to) qs.set("to", params.to);
  if (params.subject_id) qs.set("subject_id", String(params.subject_id));
  const query = qs.toString() ? `?${qs.toString()}` : "";
  return api<StudySession[]>(`/api/v1/sessions${query}`, { token });
}

export function getSession(token: string, id: number): Promise<StudySession> {
  return api<StudySession>(`/api/v1/sessions/${id}`, { token });
}

export function createSession(
  token: string,
  input: CreateSessionInput,
): Promise<StudySession> {
  return api<StudySession>("/api/v1/sessions", { method: "POST", body: input, token });
}

export function updateSession(
  token: string,
  id: number,
  input: CreateSessionInput,
): Promise<StudySession> {
  return api<StudySession>(`/api/v1/sessions/${id}`, {
    method: "PUT",
    body: input,
    token,
  });
}

export function deleteSession(token: string, id: number): Promise<void> {
  return api<void>(`/api/v1/sessions/${id}`, { method: "DELETE", token });
}
