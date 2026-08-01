import { api } from "./client";

export type Subject = {
  id: number;
  user_id: number;
  name: string;
  icon: string;
  created_at: string;
};

export function listSubjects(token: string): Promise<Subject[]> {
  return api<Subject[]>("/api/v1/subjects", { token });
}

export function createSubject(
  token: string,
  name: string,
  icon: string,
): Promise<Subject> {
  return api<Subject>("/api/v1/subjects", {
    method: "POST",
    body: { name, icon },
    token,
  });
}

export function deleteSubject(token: string, id: number): Promise<void> {
  return api<void>(`/api/v1/subjects/${id}`, { method: "DELETE", token });
}
