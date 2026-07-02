"use client";

import { useEffect, useState } from "react";
import { Icon } from "./Icon";
import { Button } from "@/components/ui/pixelact-ui/button";

const STORAGE_KEY = "finance-theme";

function getInitialDark(): boolean {
  if (typeof window === "undefined") return false;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "dark") return true;
  if (stored === "light") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const dark = getInitialDark();
    setIsDark(dark);
    document.documentElement.classList.toggle("dark", dark);
    setMounted(true);
  }, []);

  function toggleTheme() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
  }

  if (!mounted) {
    return <div className="h-9 w-9" aria-hidden />;
  }

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      className="pressable focus-ring"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to day mode" : "Switch to night mode"}
    >
      <Icon name={isDark ? "themeDark" : "themeLight"} size="md" />
    </Button>
  );
}
