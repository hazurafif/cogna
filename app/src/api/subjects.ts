import { api } from "./client";

export type Subject = {
  id: number;
  name: string;
  icon: string;
};

export function listSubjects(token: string): Promise<Subject[]> {
  return api<Subject[]>("/api/v1/subjects", { token });
}
