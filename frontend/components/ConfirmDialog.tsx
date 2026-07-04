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
  confirmLabel = "Delete",
  loading = false,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-sm">
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
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="pressable focus-ring gap-1"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? <Spinner className="size-4" /> : <Icon name="delete" size="xs" colorClass="text-destructive-foreground" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
