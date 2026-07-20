"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import en from "@/messages/en.json";
import pt from "@/messages/pt.json";

export type Locale = "en" | "pt";

const messages: Record<Locale, Record<string, unknown>> = { en, pt };

function getNested(obj: Record<string, unknown>, path: string): string | undefined {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || typeof current !== "object" || !(part in current)) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === "string" ? current : undefined;
}

function interpolate(template: string, vars?: Record<string, string>): string {
  if (!vars) {
    return template;
  }
  return template.replace(/\{(\w+)\}/g, (_, key: string) => vars[key] ?? `{${key}}`);
}

export function detectBrowserLocale(): Locale {
  if (typeof navigator === "undefined") {
    return "en";
  }
  return navigator.language.toLowerCase().startsWith("pt") ? "pt" : "en";
}

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, vars?: Record<string, string>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({
  locale,
  setLocale,
  children,
}: {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  children: ReactNode;
}) {
  const t = useCallback(
    (key: string, vars?: Record<string, string>) => {
      const value = getNested(messages[locale], key) ?? getNested(messages.en, key) ?? key;
      return interpolate(value, vars);
    },
    [locale],
  );

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslation() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useTranslation must be used within I18nProvider");
  }
  return ctx;
}

export function translateError(code: string, locale: Locale): string {
  const t = (key: string) => getNested(messages[locale], key) ?? getNested(messages.en, key) ?? code;
  return t(`errors.${code}`) ?? code;
}

/** Maps stored report error codes (or legacy raw messages) to user-facing copy. */
export function translateReportError(error: string | null, locale: Locale): string {
  if (!error) {
    return (
      getNested(messages[locale], "reports.generateFailed") ??
      getNested(messages.en, "reports.generateFailed") ??
      "Could not generate report."
    );
  }

  if (/^[A-Z][A-Z0-9_]*$/.test(error)) {
    const translated = translateError(error, locale);
    if (translated !== error) {
      return translated;
    }
  }

  return (
    getNested(messages[locale], "reports.generateFailed") ??
    getNested(messages.en, "reports.generateFailed") ??
    "Could not generate report."
  );
}
