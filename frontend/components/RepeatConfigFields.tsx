"use client";

import { type RepeatMode } from "@/lib/recurrence";
import { useTranslation } from "@/lib/i18n";

interface RepeatConfigFieldsProps {
  idPrefix: string;
  mode: RepeatMode;
  onModeChange: (mode: RepeatMode) => void;
  startYearMonth: string;
  onStartYearMonthChange: (value: string) => void;
  occurrenceCount: string;
  onOccurrenceCountChange: (value: string) => void;
  endYearMonth: string;
  onEndYearMonthChange: (value: string) => void;
  disabled?: boolean;
  hideNoneOption?: boolean;
  lockStartMonth?: boolean;
}

export function RepeatConfigFields({
  idPrefix,
  mode,
  onModeChange,
  startYearMonth,
  onStartYearMonthChange,
  occurrenceCount,
  onOccurrenceCountChange,
  endYearMonth,
  onEndYearMonthChange,
  disabled = false,
  hideNoneOption = false,
  lockStartMonth = false,
}: RepeatConfigFieldsProps) {
  const { t } = useTranslation();

  return (
    <div className="wa-stack wa-gap-m">
      <div className="wa-stack wa-gap-2xs">
        <label htmlFor={`${idPrefix}-repeat-mode`}>{t("repeat.mode")}</label>
        <wa-select
          id={`${idPrefix}-repeat-mode`}
          value={mode}
          disabled={disabled || undefined}
          onChange={(event) => onModeChange((event.target as HTMLSelectElement).value as RepeatMode)}
        >
          {!hideNoneOption ? <wa-option value="none">{t("repeat.none")}</wa-option> : null}
          <wa-option value="never">{t("repeat.forever")}</wa-option>
          <wa-option value="count">{t("repeat.count")}</wa-option>
          <wa-option value="until">{t("repeat.until")}</wa-option>
        </wa-select>
      </div>

      {mode !== "none" ? (
        <div className="wa-stack wa-gap-2xs">
          <label htmlFor={`${idPrefix}-start-month`}>{t("repeat.startMonth")}</label>
          <wa-input
            id={`${idPrefix}-start-month`}
            type="month"
            value={startYearMonth}
            onInput={(event) => onStartYearMonthChange((event.target as HTMLInputElement).value)}
            disabled={disabled || lockStartMonth || undefined}
            required
          ></wa-input>
        </div>
      ) : null}

      {mode === "count" ? (
        <div className="wa-stack wa-gap-2xs">
          <label htmlFor={`${idPrefix}-count`}>{t("repeat.occurrenceCount")}</label>
          <wa-input
            id={`${idPrefix}-count`}
            type="number"
            min={1}
            step={1}
            value={occurrenceCount}
            onInput={(event) => onOccurrenceCountChange((event.target as HTMLInputElement).value)}
            disabled={disabled || undefined}
            required
          ></wa-input>
        </div>
      ) : null}

      {mode === "until" ? (
        <div className="wa-stack wa-gap-2xs">
          <label htmlFor={`${idPrefix}-end-month`}>{t("repeat.endMonth")}</label>
          <wa-input
            id={`${idPrefix}-end-month`}
            type="month"
            value={endYearMonth}
            min={startYearMonth}
            onInput={(event) => onEndYearMonthChange((event.target as HTMLInputElement).value)}
            disabled={disabled || undefined}
            required
          ></wa-input>
        </div>
      ) : null}
    </div>
  );
}
