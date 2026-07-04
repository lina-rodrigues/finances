export type ThemePreference = "light" | "dark" | null;

const STORAGE_KEY = "finance-theme";

export function resolveEffectiveTheme(preference: ThemePreference): "light" | "dark" {
  if (preference === "light" || preference === "dark") {
    return preference;
  }
  if (typeof window === "undefined") {
    return "light";
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyThemePreference(preference: ThemePreference): "light" | "dark" {
  const effective = resolveEffectiveTheme(preference);
  if (typeof document !== "undefined") {
    document.documentElement.classList.toggle("dark", effective === "dark");
    localStorage.setItem(STORAGE_KEY, effective);
  }
  return effective;
}

export function applyStoredThemeFlash(): void {
  if (typeof document === "undefined") {
    return;
  }
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "dark") {
    document.documentElement.classList.add("dark");
  } else if (stored === "light") {
    document.documentElement.classList.remove("dark");
  } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
    document.documentElement.classList.add("dark");
  }
}

export function subscribeSystemTheme(onChange: (isDark: boolean) => void): () => void {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const handler = (e: MediaQueryListEvent) => onChange(e.matches);
  mq.addEventListener("change", handler);
  return () => mq.removeEventListener("change", handler);
}
