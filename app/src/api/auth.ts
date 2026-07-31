import { api } from "./client";

export type User = {
  id: number;
  email: string;
  created_at: string;
};

export type AuthResponse = {
  token: string;
  user: User;
};

export function login(email: string, password: string): Promise<AuthResponse> {
  return api<AuthResponse>("/api/v1/auth/login", {
    method: "POST",
    body: { email, password },
  });
}

export function register(email: string, password: string): Promise<AuthResponse> {
  return api<AuthResponse>("/api/v1/auth/register", {
    method: "POST",
    body: { email, password },
  });
}

export function fetchMe(token: string): Promise<{ user: User }> {
  return api<{ user: User }>("/api/v1/me", { token });
}
