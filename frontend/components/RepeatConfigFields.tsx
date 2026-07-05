"use client";

import { Input } from "@/components/ui/pixelact-ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/pixelact-ui/select";
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
    <div className="space-y-3">
      <div className="space-y-1">
        <label htmlFor={`${idPrefix}-repeat-mode`} className="text-body text-sm font-semibold">
          {t("repeat.mode")}
        </label>
        <div className="finance-dialog-field">
          <Select
            value={mode}
            onValueChange={(value) => onModeChange(value as RepeatMode)}
            disabled={disabled}
          >
            <SelectTrigger id={`${idPrefix}-repeat-mode`} size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {!hideNoneOption && <SelectItem value="none">{t("repeat.none")}</SelectItem>}
              <SelectItem value="never">{t("repeat.forever")}</SelectItem>
              <SelectItem value="count">{t("repeat.count")}</SelectItem>
              <SelectItem value="until">{t("repeat.until")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {mode !== "none" && (
        <div className="space-y-1">
          <label htmlFor={`${idPrefix}-start-month`} className="text-body text-sm font-semibold">
            {t("repeat.startMonth")}
          </label>
          <div className="finance-dialog-field">
            <Input
              id={`${idPrefix}-start-month`}
              type="month"
              value={startYearMonth}
              onChange={(event) => onStartYearMonthChange(event.target.value)}
              disabled={disabled || lockStartMonth}
              required
            />
          </div>
        </div>
      )}

      {mode === "count" && (
        <div className="space-y-1">
          <label htmlFor={`${idPrefix}-count`} className="text-body text-sm font-semibold">
            {t("repeat.occurrenceCount")}
          </label>
          <div className="finance-dialog-field">
            <Input
              id={`${idPrefix}-count`}
              type="number"
              min={1}
              step={1}
              value={occurrenceCount}
              onChange={(event) => onOccurrenceCountChange(event.target.value)}
              disabled={disabled}
              required
            />
          </div>
        </div>
      )}

      {mode === "until" && (
        <div className="space-y-1">
          <label htmlFor={`${idPrefix}-end-month`} className="text-body text-sm font-semibold">
            {t("repeat.endMonth")}
          </label>
          <div className="finance-dialog-field">
            <Input
              id={`${idPrefix}-end-month`}
              type="month"
              value={endYearMonth}
              min={startYearMonth}
              onChange={(event) => onEndYearMonthChange(event.target.value)}
              disabled={disabled}
              required
            />
          </div>
        </div>
      )}
    </div>
  );
}
