"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { updateUserProfile, type ThemePreference } from "@/lib/auth-api";
import { categoryManagePath } from "@/lib/api";
import { useAuth } from "@/lib/AuthProvider";
import { getCurrencyOptions } from "@/lib/currencies";
import { useMonthView } from "@/lib/MonthViewProvider";
import { useTranslation } from "@/lib/i18n";
import { useMutationFeedback } from "@/lib/useMutationFeedback";
import type { AiReportTone, AppLanguage } from "@/lib/auth-api";

import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner,
} from "@lina-rodrigues/cotton-candy";
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

type SettingsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
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
  const closingRef = useRef(false);

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

  function syncFormFromUser() {
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
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      closingRef.current = true;
      syncFormFromUser();
    } else {
      closingRef.current = false;
    }
    onOpenChange(next);
  }

  useEffect(() => {
    if (!open || !user) {
      return;
    }
    setName(user.name);
    setThemeOption(themeToOption(user.preferences.theme));
    setCurrency(user.preferences.currency);
    setLanguage(user.preferences.language);
    setAiReportTone(user.preferences.aiReportTone ?? "normal");
    setCurrencyQuery("");
    setCurrencyOpen(false);
  }, [open, user]);

  useEffect(() => {
    if (open) {
      return;
    }
    closingRef.current = false;
  }, [open]);

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
    if (closingRef.current || !user || !open) {
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

  const themeItems = useMemo(
    () => ({
      system: t("settings.themeSystem"),
      light: t("settings.themeLight"),
      dark: t("settings.themeDark"),
    }),
    [t],
  );

  const languageItems = useMemo(
    () => ({
      en: t("settings.languageEn"),
      pt: t("settings.languagePt"),
    }),
    [t],
  );

  const aiReportToneItems = useMemo(
    () => ({
      normal: t("settings.aiReportToneNormal"),
      formal: t("settings.aiReportToneFormal"),
      technical: t("settings.aiReportToneTechnical"),
      informal: t("settings.aiReportToneInformal"),
    }),
    [t],
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[85dvh] flex-col gap-4 overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="text-display text-xs normal-case">{t("settings.title")}</DialogTitle>
        </DialogHeader>

        <div className="finance-dialog-form min-h-0 flex-1 space-y-4 overflow-x-hidden overflow-y-auto px-6">
          <div className="space-y-1">
            <Label htmlFor="settings-name">{t("settings.name")}</Label>
            <div className="finance-dialog-field">
              <Input
                id="settings-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => void handleNameBlur()}
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="settings-theme">{t("settings.theme")}</Label>
            <div className="finance-dialog-field">
              <Select
                value={themeOption}
                items={themeItems}
                onValueChange={(value) => void handleThemeChange(value as ThemeOption)}
                disabled={loading}
              >
                <SelectTrigger id="settings-theme">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="system">{t("settings.themeSystem")}</SelectItem>
                  <SelectItem value="light">{t("settings.themeLight")}</SelectItem>
                  <SelectItem value="dark">{t("settings.themeDark")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1" ref={currencyContainerRef}>
            <Label htmlFor={`${currencyListId}-input`}>{t("settings.currency")}</Label>
            <div className="finance-dialog-field relative">
              <Input
                id={`${currencyListId}-input`}
                role="combobox"
                aria-expanded={currencyOpen}
                aria-controls={`${currencyListId}-listbox`}
                value={currencyOpen ? currencyQuery : `${currency} — ${selectedCurrency?.name ?? currency}`}
                onChange={(e) => {
                  setCurrencyQuery(e.target.value);
                  setCurrencyOpen(true);
                }}
                onFocus={() => setCurrencyOpen(true)}
                disabled={loading}
              />
              {currencyOpen && (
                <ul
                  id={`${currencyListId}-listbox`}
                  role="listbox"
                  className="absolute top-full z-[60] mt-1 max-h-48 w-full overflow-y-auto border bg-background shadow-(--pixel-box-shadow)"
                >
                  {filteredCurrencies.map((option) => (
                    <li key={option.code} role="presentation">
                      <button
                        type="button"
                        role="option"
                        aria-selected={option.code === currency}
                        className={`text-body flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted ${
                          option.code === currency ? "bg-muted" : ""
                        } ${option.pinned ? "font-semibold" : ""}`}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => void handleCurrencySelect(option.code)}
                      >
                        <span>{option.code}</span>
                        <span className="text-muted-finance truncate">{option.name}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="settings-language">{t("settings.language")}</Label>
            <div className="finance-dialog-field">
              <Select
                value={language}
                items={languageItems}
                onValueChange={(value) => void handleLanguageChange(value as AppLanguage)}
                disabled={loading}
              >
                <SelectTrigger id="settings-language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">{t("settings.languageEn")}</SelectItem>
                  <SelectItem value="pt">{t("settings.languagePt")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="settings-ai-report-tone">{t("settings.aiReportTone")}</Label>
            <div className="finance-dialog-field">
              <Select
                value={aiReportTone}
                items={aiReportToneItems}
                onValueChange={(value) => void handleAiReportToneChange(value as AiReportTone)}
                disabled={loading}
              >
                <SelectTrigger id="settings-ai-report-tone">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">{t("settings.aiReportToneNormal")}</SelectItem>
                  <SelectItem value="formal">{t("settings.aiReportToneFormal")}</SelectItem>
                  <SelectItem value="technical">{t("settings.aiReportToneTechnical")}</SelectItem>
                  <SelectItem value="informal">{t("settings.aiReportToneInformal")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="pt-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="pressable focus-ring w-full gap-1"
              asChild
            >
              <Link
                href={categoryManagePath(month.yearMonth)}
                onClick={() => handleOpenChange(false)}
              >
                <Icon name="edit" size="xs" />
                {t("settings.manageCategories")}
              </Link>
            </Button>
          </div>
        </div>

        <DialogFooter className="gap-2 px-6 pb-6 pt-2 sm:justify-between">
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="pressable focus-ring gap-1"
            onClick={() => void logout()}
            disabled={loading}
          >
            {t("settings.logout")}
          </Button>
          <DialogClose asChild>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="pressable focus-ring"
            >
              {loading ? <Spinner className="size-4" /> : t("common.cancel")}
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
