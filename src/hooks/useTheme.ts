"use client";

import { useState, useEffect, useCallback } from "react";

type Theme = "light" | "dark" | "system";

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>("system");
  const [resolved, setResolved] = useState<"light" | "dark">("dark");

  const applyTheme = useCallback((t: "light" | "dark") => {
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(t);
    document.documentElement.setAttribute("data-theme", t);
    setResolved(t);
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    if (typeof window !== "undefined") {
      localStorage.setItem("stakd-theme", t);
    }
    if (t === "system") {
      const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      applyTheme(systemDark ? "dark" : "light");
    } else {
      applyTheme(t);
    }
  }, [applyTheme]);

  useEffect(() => {
    const saved = localStorage.getItem("stakd-theme") as Theme | null;
    const initial = saved || "system";
    setThemeState(initial);

    if (initial === "system") {
      const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      applyTheme(systemDark ? "dark" : "light");
    } else {
      applyTheme(initial);
    }

    // Listen for system theme changes
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => {
      const current = localStorage.getItem("stakd-theme") as Theme | null;
      if (!current || current === "system") {
        applyTheme(e.matches ? "dark" : "light");
      }
    };
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [applyTheme]);

  return { theme, resolved, setTheme };
}
