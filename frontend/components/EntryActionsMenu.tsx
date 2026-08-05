"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "@/lib/i18n";

import { Button, Icon } from "@lina-rodrigues/cotton-candy";

interface EntryActionsMenuProps {
  onEdit: () => void;
  onDelete: () => void;
  disabled?: boolean;
}

export function EntryActionsMenu({ onEdit, onDelete, disabled = false }: EntryActionsMenuProps) {
  const { t } = useTranslation();
  const menuId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative shrink-0">
      <Button
        type="button"
        variant="link"
        size="sm"
        className="pressable focus-ring h-8 w-8 p-0"
        aria-label={t("entries.entryActions")}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="flex flex-col items-center justify-center gap-0.5" aria-hidden="true">
          <span className="size-1 rounded-full bg-current" />
          <span className="size-1 rounded-full bg-current" />
          <span className="size-1 rounded-full bg-current" />
        </span>
      </Button>
      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label={t("entries.entryActions")}
          className="absolute top-full right-0 z-[60] mt-1 min-w-36 border bg-background py-1 shadow-(--pixel-box-shadow)"
        >
          <button
            type="button"
            role="menuitem"
            className="interactive-row pressable focus-ring flex w-full items-center gap-2 px-3 py-2 text-left text-sm"
            onClick={() => {
              setOpen(false);
              onEdit();
            }}
          >
            <Icon name="edit" size="xs" />
            {t("entries.edit")}
          </button>
          <button
            type="button"
            role="menuitem"
            className="interactive-row pressable focus-ring flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-expense"
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
          >
            <Icon name="delete" size="xs" colorClass="text-expense" />
            {t("entries.deleteEntry")}
          </button>
        </div>
      )}
    </div>
  );
}
