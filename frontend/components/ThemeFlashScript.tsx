"use client";

import { useEffect } from "react";
import { applyStoredThemeFlash } from "@/lib/theme";

export function ThemeFlashScript() {
  useEffect(() => {
    applyStoredThemeFlash();
  }, []);
  return null;
}
