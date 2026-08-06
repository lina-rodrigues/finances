"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { updateUserProfile, type ThemePreference } from "@/lib/auth-api";
import { categoryManagePath } from "@/lib/api";
import { useAuth } from "@/lib/AuthProvider";
import { getCurrencyOptions } from "@/lib/currencies";
import { useMonthView } from "@/lib/MonthViewProvider";
import { useTranslation } from "@/lib/i18n";
import { useMutationFeedback } from "@/lib/useMutationFeedback";
import type { AiReportTone, AppLanguage } from "@/lib/auth-api";
import { PageTitle } from "@/components/PageTitle";

type ThemeOption = "system" | "light" | "dark";

function themeToOption(theme: ThemePreference): ThemeOption {
  if (theme === "light" || theme === "dark") {
    return theme;
  }
  return "system";
}

function optionToTheme(option: ThemeOption): ThemePreference {
  return option === "system" ? null : option;
}

type SettingsSnapshot = {
  name: string;
  themeOption: ThemeOption;
  currency: string;
  language: AppLanguage;
  aiReportTone: AiReportTone;
};

function eventValue(event: { target: EventTarget | null }): string {
  return (event.target as HTMLInputElement & { value: string }).value;
}

export function SettingsPage() {
  const { user, updateLocalPreferences, updateLocalName, logout } = useAuth();
  const { month } = useMonthView();
  const { t, setLocale } = useTranslation();
  const { loading, runOptimistic } = useMutationFeedback();
  const currencyListId = useId();

  const [name, setName] = useState(user?.name ?? "");
  const [themeOption, setThemeOption] = useState<ThemeOption>("system");
  const [currency, setCurrency] = useState("USD");
  const [language, setLanguage] = useState<AppLanguage>("en");
  const [aiReportTone, setAiReportTone] = useState<AiReportTone>("normal");
  const [currencyQuery, setCurrencyQuery] = useState("");
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const currencyContainerRef = useRef<HTMLDivElement>(null);

  const currencyOptions = useMemo(() => getCurrencyOptions(), []);
  const filteredCurrencies = useMemo(() => {
    const q = currencyQuery.trim().toLowerCase();
    if (!q) {
      return currencyOptions;
    }
    return currencyOptions.filter(
      (c) => c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q),
    );
  }, [currencyOptions, currencyQuery]);

  useEffect(() => {
    if (!user) {
      return;
    }
    setName(user.name);
    setThemeOption(themeToOption(user.preferences.theme));
    setCurrency(user.preferences.currency);
    setLanguage(user.preferences.language);
    setAiReportTone(user.preferences.aiReportTone ?? "normal");
    setCurrencyQuery("");
    setCurrencyOpen(false);
  }, [user]);

  useEffect(() => {
    if (!currencyOpen) {
      return;
    }
    function handlePointerDown(e: MouseEvent) {
      if (currencyContainerRef.current && !currencyContainerRef.current.contains(e.target as Node)) {
        setCurrencyOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [currencyOpen]);

  function captureSettingsSnapshot(): SettingsSnapshot {
    return { name, themeOption, currency, language, aiReportTone };
  }

  function rollbackSettings(snapshot: SettingsSnapshot) {
    setName(snapshot.name);
    setThemeOption(snapshot.themeOption);
    setCurrency(snapshot.currency);
    setLanguage(snapshot.language);
    setAiReportTone(snapshot.aiReportTone);
    updateLocalName(snapshot.name);
    updateLocalPreferences({
      theme: optionToTheme(snapshot.themeOption),
      currency: snapshot.currency,
      language: snapshot.language,
      aiReportTone: snapshot.aiReportTone,
    });
    setLocale(snapshot.language);
  }

  async function handleNameBlur() {
    if (!user) {
      return;
    }

    const trimmed = name.trim();
    if (!trimmed || trimmed === user.name) {
      return;
    }

    await runOptimistic({
      snapshot: (): SettingsSnapshot => ({
        name: user.name,
        themeOption,
        currency,
        language,
        aiReportTone,
      }),
      apply: () => updateLocalName(trimmed),
      mutate: async () => {
        const updated = await updateUserProfile({ name: trimmed });
        updateLocalName(updated.name);
        setName(updated.name);
      },
      rollback: rollbackSettings,
      successMessage: t("settings.saved"),
    });
  }

  async function handleThemeChange(option: ThemeOption) {
    const next = optionToTheme(option);
    await runOptimistic({
      snapshot: captureSettingsSnapshot,
      apply: () => {
        setThemeOption(option);
        updateLocalPreferences({ theme: next });
      },
      mutate: async () => {
        const updated = await updateUserProfile({ preferences: { theme: next } });
        updateLocalName(updated.name);
        updateLocalPreferences(updated.preferences);
      },
      rollback: rollbackSettings,
      successMessage: t("settings.saved"),
    });
  }

  async function handleLanguageChange(next: AppLanguage) {
    await runOptimistic({
      snapshot: captureSettingsSnapshot,
      apply: () => {
        setLanguage(next);
        updateLocalPreferences({ language: next });
        setLocale(next);
      },
      mutate: async () => {
        const updated = await updateUserProfile({ preferences: { language: next } });
        updateLocalName(updated.name);
        updateLocalPreferences(updated.preferences);
        setLocale(updated.preferences.language);
      },
      rollback: rollbackSettings,
      successMessage: t("settings.saved"),
    });
  }

  async function handleAiReportToneChange(next: AiReportTone) {
    await runOptimistic({
      snapshot: captureSettingsSnapshot,
      apply: () => {
        setAiReportTone(next);
        updateLocalPreferences({ aiReportTone: next });
      },
      mutate: async () => {
        const updated = await updateUserProfile({ preferences: { aiReportTone: next } });
        updateLocalName(updated.name);
        updateLocalPreferences(updated.preferences);
        setAiReportTone(updated.preferences.aiReportTone ?? "normal");
      },
      rollback: rollbackSettings,
      successMessage: t("settings.saved"),
    });
  }

  async function handleCurrencySelect(code: string) {
    await runOptimistic({
      snapshot: captureSettingsSnapshot,
      apply: () => {
        setCurrency(code);
        setCurrencyOpen(false);
        setCurrencyQuery("");
        updateLocalPreferences({ currency: code });
      },
      mutate: async () => {
        const updated = await updateUserProfile({ preferences: { currency: code } });
        updateLocalName(updated.name);
        updateLocalPreferences(updated.preferences);
      },
      rollback: (snapshot) => {
        rollbackSettings(snapshot);
        setCurrencyOpen(false);
        setCurrencyQuery("");
      },
      successMessage: t("settings.saved"),
    });
  }

  const selectedCurrency = currencyOptions.find((c) => c.code === currency);

  return (
    <div className="wa-stack wa-gap-l settings-form">
      <PageTitle>{t("settings.title")}</PageTitle>

      <wa-card>
        <div className="wa-stack wa-gap-m">
          <wa-input
            id="settings-name"
            label={t("settings.name")}
            value={name}
            disabled={loading || undefined}
            onInput={(e) => setName(eventValue(e))}
            onBlur={() => void handleNameBlur()}
          ></wa-input>

          <wa-select
            id="settings-theme"
            label={t("settings.theme")}
            value={themeOption}
            disabled={loading || undefined}
            onChange={(e: Event) => void handleThemeChange(eventValue(e) as ThemeOption)}
          >
            <wa-option value="system">{t("settings.themeSystem")}</wa-option>
            <wa-option value="light">{t("settings.themeLight")}</wa-option>
            <wa-option value="dark">{t("settings.themeDark")}</wa-option>
          </wa-select>

          <div className="wa-stack wa-gap-2xs" ref={currencyContainerRef} style={{ position: "relative" }}>
            <wa-input
              id={`${currencyListId}-input`}
              label={t("settings.currency")}
              role="combobox"
              aria-expanded={currencyOpen}
              aria-controls={`${currencyListId}-listbox`}
              value={currencyOpen ? currencyQuery : `${currency} — ${selectedCurrency?.name ?? currency}`}
              disabled={loading || undefined}
              onInput={(e) => {
                setCurrencyQuery(eventValue(e));
                setCurrencyOpen(true);
              }}
              onFocus={() => setCurrencyOpen(true)}
            ></wa-input>
            {currencyOpen && (
              <ul
                id={`${currencyListId}-listbox`}
                role="listbox"
                className="wa-stack wa-gap-2xs"
                style={{
                  position: "absolute",
                  top: "100%",
                  zIndex: 60,
                  width: "100%",
                  maxHeight: "12rem",
                  overflowY: "auto",
                  margin: 0,
                  padding: "var(--wa-space-2xs)",
                  listStyle: "none",
                  background: "var(--wa-color-surface-raised)",
                  border: "var(--wa-border-width-s) solid var(--wa-color-surface-border)",
                  borderRadius: "var(--wa-border-radius-m)",
                }}
              >
                {filteredCurrencies.map((option) => (
                  <li key={option.code} role="presentation">
                    <button
                      type="button"
                      role="option"
                      aria-selected={option.code === currency}
                      className="list-row"
                      style={{
                        fontWeight: option.pinned ? "var(--wa-font-weight-semibold)" : undefined,
                        background:
                          option.code === currency
                            ? "var(--wa-color-neutral-fill-quiet)"
                            : undefined,
                      }}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => void handleCurrencySelect(option.code)}
                    >
                      <span>{option.code}</span>
                      <span className="wa-caption-s wa-color-text-quiet" style={{ minWidth: 0 }}>
                        {option.name}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <wa-select
            id="settings-language"
            label={t("settings.language")}
            value={language}
            disabled={loading || undefined}
            onChange={(e: Event) => void handleLanguageChange(eventValue(e) as AppLanguage)}
          >
            <wa-option value="en">{t("settings.languageEn")}</wa-option>
            <wa-option value="pt">{t("settings.languagePt")}</wa-option>
          </wa-select>

          <wa-select
            id="settings-ai-report-tone"
            label={t("settings.aiReportTone")}
            value={aiReportTone}
            disabled={loading || undefined}
            onChange={(e: Event) => void handleAiReportToneChange(eventValue(e) as AiReportTone)}
          >
            <wa-option value="normal">{t("settings.aiReportToneNormal")}</wa-option>
            <wa-option value="formal">{t("settings.aiReportToneFormal")}</wa-option>
            <wa-option value="technical">{t("settings.aiReportToneTechnical")}</wa-option>
            <wa-option value="informal">{t("settings.aiReportToneInformal")}</wa-option>
          </wa-select>
        </div>
      </wa-card>

      <wa-card>
        <div className="wa-stack wa-gap-m">
          <Link href={categoryManagePath(month.yearMonth)}>
            <wa-button type="button" appearance="outlined" style={{ width: "100%" }}>
              <wa-icon slot="start" name="pen-to-square"></wa-icon>
              {t("settings.manageCategories")}
            </wa-button>
          </Link>

          <wa-button
            type="button"
            variant="danger"
            appearance="outlined"
            disabled={loading || undefined}
            onClick={() => void logout()}
          >
            <wa-icon slot="start" name="right-from-bracket"></wa-icon>
            {t("settings.logout")}
          </wa-button>
        </div>
      </wa-card>
    </div>
  );
}
