"use client";

import { Icon } from "@/components/Icon";
import { type RecurrenceScope } from "@/lib/recurrence";
import { useTranslation } from "@/lib/i18n";

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Spinner,
} from "@lina-rodrigues/cotton-candy";
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === "edit" ? t("repeat.editScopeTitle") : t("repeat.deleteScopeTitle")}
          </DialogTitle>
          <DialogDescription className="text-body text-muted-finance pt-2">
            {loading && loadingDescription ? loadingDescription : t("repeat.scopePrompt")}
          </DialogDescription>
        </DialogHeader>

        <fieldset className="space-y-2" disabled={loading}>
          <legend className="sr-only">{t("repeat.scopePrompt")}</legend>
          {options.map((option) => (
            <label
              key={option.value}
              className="interactive-surface flex cursor-pointer gap-3 p-3"
            >
              <input
                type="radio"
                name="repeat-scope"
                value={option.value}
                checked={scope === option.value}
                onChange={() => onScopeChange(option.value)}
                className="mt-1"
              />
              <span className="min-w-0">
                <span className="text-body block font-semibold">{option.label}</span>
                <span className="text-body text-muted-finance block text-sm">
                  {option.description}
                </span>
              </span>
            </label>
          ))}
        </fieldset>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="pressable focus-ring gap-1"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            <Icon name="cancel" size="xs" />
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            variant={mode === "delete" ? "destructive" : "default"}
            size="sm"
            className="pressable focus-ring gap-1"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? (
              <Spinner className="size-4" />
            ) : mode === "delete" ? (
              <Icon name="delete" size="xs" colorClass="text-destructive-foreground" />
            ) : (
              <Icon name="save" size="xs" />
            )}
            {mode === "delete" ? t("common.delete") : t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
