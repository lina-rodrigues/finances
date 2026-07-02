"use client";

import { useEffect, useState } from "react";
import { Icon } from "./Icon";

const STORAGE_KEY = "finance-theme";
const THEMES = ["finance-light", "finance-dark"] as const;
type Theme = (typeof THEMES)[number];

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "finance-light";
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "finance-dark" || stored === "finance-light") return stored;
  if (window.matchMedia("(prefers-color-scheme: dark)").matches) return "finance-dark";
  return "finance-light";
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("finance-light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const initial = getInitialTheme();
    setTheme(initial);
    document.documentElement.setAttribute("data-theme", initial);
    setMounted(true);
  }, []);

  function toggleTheme() {
    const next: Theme = theme === "finance-light" ? "finance-dark" : "finance-light";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem(STORAGE_KEY, next);
  }

  if (!mounted) {
    return <div className="btn btn-ghost btn-circle btn-sm" aria-hidden />;
  }

  const isDark = theme === "finance-dark";

  return (
    <button
      type="button"
      className="btn btn-ghost btn-circle btn-sm pressable focus-ring border-2 border-primary/30"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to day mode" : "Switch to night mode"}
    >
      <Icon name={isDark ? "themeDark" : "themeLight"} size="md" />
    </button>
  );
}
