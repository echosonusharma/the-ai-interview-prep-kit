"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import type { User } from "@/lib/types";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { push } = useToast();

  const refresh = useCallback(async () => {
    try {
      const { user: u } = await api.me();
      setUser(u);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // One-shot session fetch on mount - valid useEffect
    void refresh();
  }, [refresh]);

  const login = async (email: string, password: string) => {
    const { user: u } = await api.login({ email, password });
    setUser(u);
    push("success", "Signed in", `Welcome back, ${userDisplayName(u)}.`);
    window.location.replace("/");
  };

  const signup = async (email: string, password: string, name?: string) => {
    const { user: u } = await api.signup({ email, password, name });
    setUser(u);
    push("success", "Account created", `Welcome, ${userDisplayName(u)}.`);
    window.location.replace("/");
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch (e) {
      if (!(e instanceof ApiError)) throw e;
    }
    setUser(null);
    push("info", "Signed out");
    window.location.replace("/login");
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function userInitials(user: User | null): string {
  if (!user) return "?";
  if (user.name?.trim()) {
    return user.name
      .split(/\s+/)
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }
  return user.email.slice(0, 2).toUpperCase();
}

export function userDisplayName(user: User | null): string {
  if (!user) return "Guest";
  return user.name?.trim() || user.email.split("@")[0] || "User";
}
