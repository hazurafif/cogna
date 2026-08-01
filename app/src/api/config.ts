import { Platform } from "react-native";

const DEFAULT_PORT = "8080";

export type Env = { EXPO_PUBLIC_API_URL?: string; EXPO_PUBLIC_API_PORT?: string };

export function apiUrl(env: Env = process.env as Env): string {
  if (env.EXPO_PUBLIC_API_URL) return env.EXPO_PUBLIC_API_URL;
  const port = env.EXPO_PUBLIC_API_PORT ?? DEFAULT_PORT;
  const host = Platform.OS === "android" ? "10.0.2.2" : "localhost";
  return `http://${host}:${port}`;
}

export const API_URL = apiUrl();
