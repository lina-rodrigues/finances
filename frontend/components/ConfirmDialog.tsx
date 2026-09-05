"use client";

import { useRef } from "react";
import { useTranslation } from "@/lib/i18n";
import { useWaDialogAfterHide } from "@/lib/useWaDialogAfterHide";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  loading = false,
  onConfirm,
}: ConfirmDialogProps) {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLElement | null>(null);
  useWaDialogAfterHide(dialogRef, open, onOpenChange);

  return (
    <wa-dialog
      ref={dialogRef}
      open={open || undefined}
      label={title}
      light-dismiss
    >
      {description ? <p className="wa-caption-m wa-color-text-quiet">{description}</p> : null}
      <div slot="footer" className="wa-cluster wa-gap-s">
        <wa-button
          type="button"
          appearance="outlined"
          disabled={loading || undefined}
          onClick={() => onOpenChange(false)}
        >
          {t("common.cancel")}
        </wa-button>
        <wa-button
          type="button"
          variant="danger"
          disabled={loading || undefined}
          onClick={onConfirm}
        >
          {loading ? (
            <wa-spinner slot="start" style={{ fontSize: "0.875rem" }}></wa-spinner>
          ) : (
            <wa-icon slot="start" name="trash"></wa-icon>
          )}
          {confirmLabel ?? t("common.delete")}
        </wa-button>
      </div>
    </wa-dialog>
  );
}
