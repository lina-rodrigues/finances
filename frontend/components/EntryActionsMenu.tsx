"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "@/lib/i18n";

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
    <div ref={containerRef} style={{ position: "relative", flexShrink: 0 }}>
      <wa-button
        type="button"
        appearance="plain"
        size="s"
        aria-label={t("entries.entryActions")}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        disabled={disabled || undefined}
        onClick={() => setOpen((prev) => !prev)}
      >
        <wa-icon name="ellipsis-vertical" label={t("entries.entryActions")}></wa-icon>
      </wa-button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label={t("entries.entryActions")}
          className="wa-stack wa-gap-3xs"
          style={{
            position: "absolute",
            top: "100%",
            right: 0,
            zIndex: 60,
            marginTop: "var(--wa-space-2xs)",
            minWidth: "9rem",
            padding: "var(--wa-space-2xs)",
            background: "var(--wa-color-surface-raised)",
            border: "1px solid var(--wa-color-surface-border)",
            boxShadow: "var(--wa-shadow-m)",
          }}
        >
          <wa-button
            type="button"
            appearance="plain"
            size="s"
            role="menuitem"
            style={{ justifyContent: "flex-start", width: "100%" }}
            onClick={() => {
              setOpen(false);
              onEdit();
            }}
          >
            <wa-icon slot="start" name="pen"></wa-icon>
            {t("entries.edit")}
          </wa-button>
          <wa-button
            type="button"
            appearance="plain"
            size="s"
            variant="danger"
            role="menuitem"
            style={{ justifyContent: "flex-start", width: "100%" }}
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
          >
            <wa-icon slot="start" name="trash"></wa-icon>
            {t("entries.deleteEntry")}
          </wa-button>
        </div>
      ) : null}
    </div>
  );
}
