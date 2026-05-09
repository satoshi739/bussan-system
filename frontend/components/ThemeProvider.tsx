"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type Theme = "light" | "dark" | "green" | "purple";

export const THEMES: { id: Theme; label: string; color: string; bg: string }[] = [
  { id: "light",  label: "ブルー",    color: "#006FE6", bg: "#EEF2FA" },
  { id: "green",  label: "グリーン",  color: "#009955", bg: "#EDF7F2" },
  { id: "purple", label: "ラベンダー", color: "#6C35E0", bg: "#F2EEFF" },
  { id: "dark",   label: "ナイト",    color: "#4DA3FF", bg: "#0b0c12" },
];

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({ theme: "light", setTheme: () => {} });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("theme") as Theme) ?? "light";
    }
    return "light";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    localStorage.setItem("theme", t);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
