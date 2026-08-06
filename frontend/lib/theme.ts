export type ThemePreference = "light" | "dark" | null;

export type StoredThemePreference = "system" | "light" | "dark";

const STORAGE_KEY = "finance-theme";

export function preferenceToStored(preference: ThemePreference): StoredThemePreference {
  if (preference === "light" || preference === "dark") {
    return preference;
  }
  return "system";
}

export function resolveEffectiveTheme(preference: ThemePreference): "light" | "dark" {
  if (preference === "light" || preference === "dark") {
    return preference;
  }
  if (typeof window === "undefined") {
    return "light";
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyEffectiveTheme(isDark: boolean): void {
  const root = document.documentElement;
  root.classList.toggle("wa-dark", isDark);
  root.classList.toggle("wa-light", !isDark);
  root.classList.remove("dark");
}

export function applyThemePreference(preference: ThemePreference): "light" | "dark" {
  const stored = preferenceToStored(preference);
  const effective = resolveEffectiveTheme(preference);
  if (typeof document !== "undefined") {
    applyEffectiveTheme(effective === "dark");
    localStorage.setItem(STORAGE_KEY, stored);
  }
  return effective;
}

export function applyStoredThemeFlash(): void {
  if (typeof document === "undefined") {
    return;
  }
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "dark") {
    applyEffectiveTheme(true);
  } else if (stored === "light") {
    applyEffectiveTheme(false);
  } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
    applyEffectiveTheme(true);
  } else {
    applyEffectiveTheme(false);
  }
}

export function subscribeSystemTheme(onChange: (isDark: boolean) => void): () => void {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const handler = (e: MediaQueryListEvent) => onChange(e.matches);
  mq.addEventListener("change", handler);
  return () => mq.removeEventListener("change", handler);
}
