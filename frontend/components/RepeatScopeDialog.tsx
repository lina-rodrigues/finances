"use client";

import { useEffect, useRef } from "react";
import { type RecurrenceScope } from "@/lib/recurrence";
import { useTranslation } from "@/lib/i18n";

interface RepeatScopeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "edit" | "delete";
  scope: RecurrenceScope;
  onScopeChange: (scope: RecurrenceScope) => void;
  loading?: boolean;
  loadingDescription?: string;
  onConfirm: () => void;
}

export function RepeatScopeDialog({
  open,
  onOpenChange,
  mode,
  scope,
  onScopeChange,
  loading = false,
  loadingDescription,
  onConfirm,
}: RepeatScopeDialogProps) {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLElement | null>(null);
  const openRef = useRef(open);
  openRef.current = open;

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    const onAfterHide = () => {
      if (openRef.current) onOpenChange(false);
    };
    el.addEventListener("wa-after-hide", onAfterHide);
    return () => el.removeEventListener("wa-after-hide", onAfterHide);
  }, [onOpenChange]);

  const title = mode === "edit" ? t("repeat.editScopeTitle") : t("repeat.deleteScopeTitle");

  const options: { value: RecurrenceScope; label: string; description: string }[] = [
    {
      value: "this",
      label: t("repeat.scopeThis"),
      description:
        mode === "edit" ? t("repeat.scopeThisEditDescription") : t("repeat.scopeThisDeleteDescription"),
    },
    {
      value: "future",
      label: t("repeat.scopeFuture"),
      description:
        mode === "edit"
          ? t("repeat.scopeFutureEditDescription")
          : t("repeat.scopeFutureDeleteDescription"),
    },
    {
      value: "all",
      label: t("repeat.scopeAll"),
      description:
        mode === "edit" ? t("repeat.scopeAllEditDescription") : t("repeat.scopeAllDeleteDescription"),
    },
  ];

  return (
    <wa-dialog
      ref={dialogRef}
      label={title}
      open={open || undefined}
      light-dismiss
      style={{ "--width": "32rem" } as React.CSSProperties}
    >
      <div className="wa-stack wa-gap-m">
        <p className="wa-caption-l wa-color-text-quiet" style={{ margin: 0 }}>
          {loading && loadingDescription ? loadingDescription : t("repeat.scopePrompt")}
        </p>

        <fieldset className="wa-stack wa-gap-s" disabled={loading} style={{ border: 0, margin: 0, padding: 0 }}>
          <legend className="wa-visually-hidden">{t("repeat.scopePrompt")}</legend>
          {options.map((option) => (
            <label
              key={option.value}
              className="wa-cluster wa-gap-s"
              style={{ cursor: loading ? "not-allowed" : "pointer", alignItems: "flex-start" }}
            >
              <input
                type="radio"
                name="repeat-scope"
                value={option.value}
                checked={scope === option.value}
                onChange={() => onScopeChange(option.value)}
                style={{ marginTop: "0.25rem" }}
              />
              <span className="wa-stack wa-gap-3xs" style={{ minWidth: 0 }}>
                <span style={{ fontWeight: 600 }}>{option.label}</span>
                <span className="wa-caption-m wa-color-text-quiet">{option.description}</span>
              </span>
            </label>
          ))}
        </fieldset>
      </div>

      <div slot="footer" className="wa-cluster wa-gap-s">
        <wa-button
          type="button"
          variant="neutral"
          appearance="outlined"
          size="s"
          disabled={loading || undefined}
          onClick={() => onOpenChange(false)}
        >
          <wa-icon slot="start" name="xmark"></wa-icon>
          {t("common.cancel")}
        </wa-button>
        <wa-button
          type="button"
          variant={mode === "delete" ? "danger" : "brand"}
          size="s"
          loading={loading || undefined}
          disabled={loading || undefined}
          onClick={onConfirm}
        >
          <wa-icon slot="start" name={mode === "delete" ? "trash" : "floppy-disk"}></wa-icon>
          {mode === "delete" ? t("common.delete") : t("common.save")}
        </wa-button>
      </div>
    </wa-dialog>
  );
}
