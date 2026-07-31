import { Platform } from "react-native";

const DEFAULT_BASE = Platform.OS === "android" ? "http://10.0.2.2:8080" : "http://localhost:8080";

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_BASE;
