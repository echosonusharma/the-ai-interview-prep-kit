"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

type Ctx = {
  theme: Theme;
  toggle: () => void;
  setTheme: (t: Theme) => void;
};

const ThemeCtx = createContext<Ctx | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("theme") as Theme | null;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initial = saved ?? (prefersDark ? "dark" : "light");
    // Sync with external store (localStorage + media query) — valid useEffect
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(initial);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) localStorage.setItem("theme", theme);
  }, [theme, mounted]);

  const toggle = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  // Scoped dark: only this subtree gets .dark, so (auth) pages stay light
  // Avoid FOUC: render without dark until mounted, then apply
  return (
    <ThemeCtx.Provider value={{ theme, toggle, setTheme }}>
      <div className={theme === "dark" && mounted ? "dark" : ""} style={{ colorScheme: theme } as React.CSSProperties}>
        {children}
      </div>
    </ThemeCtx.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeCtx);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
