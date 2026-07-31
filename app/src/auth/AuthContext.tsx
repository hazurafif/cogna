import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { fetchMe, login as apiLogin, register as apiRegister, User } from "../api/auth";
import { onUnauthorized } from "../api/client";
import { clearToken, loadToken, saveToken } from "./token";

type AuthContextValue = {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const stored = await loadToken();
        if (!stored) return;
        const { user: me } = await fetchMe(stored);
        setToken(stored);
        setUser(me);
      } catch {
        await clearToken();
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    return onUnauthorized(async () => {
      await clearToken();
      setToken(null);
      setUser(null);
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      loading,
      login: async (email, password) => {
        const res = await apiLogin(email, password);
        await saveToken(res.token);
        setToken(res.token);
        setUser(res.user);
      },
      register: async (email, password) => {
        const res = await apiRegister(email, password);
        await saveToken(res.token);
        setToken(res.token);
        setUser(res.user);
      },
      logout: async () => {
        await clearToken();
        setToken(null);
        setUser(null);
      },
    }),
    [user, token, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
