"use client";

import { Button } from "@/components/ui/pixelact-ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/pixelact-ui/dialog";
import { Spinner } from "@/components/ui/pixelact-ui/spinner";
import { Icon } from "@/components/Icon";
import { useTranslation } from "@/lib/i18n";

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && (
            <DialogDescription className="text-body text-muted-finance pt-2">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>
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
            variant="destructive"
            size="sm"
            className="pressable focus-ring gap-1"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? (
              <Spinner className="size-4" />
            ) : (
              <Icon name="delete" size="xs" colorClass="text-destructive-foreground" />
            )}
            {confirmLabel ?? t("common.delete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
