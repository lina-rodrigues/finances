"use client";

import { useEffect, useRef, useState } from "react";
import { patchImportName } from "@/lib/api";
import { useTranslation } from "@/lib/i18n";
import { useMutationFeedback } from "@/lib/useMutationFeedback";

interface ImportNameEditorProps {
  importId: string;
  displayName: string;
  onRenamed: (next: { name: string | null; displayName: string }) => void;
  className?: string;
}

export function ImportNameEditor({
  importId,
  displayName,
  onRenamed,
  className,
}: ImportNameEditorProps) {
  const { t } = useTranslation();
  const { loading, run } = useMutationFeedback();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(displayName);
  const inputRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!editing) {
      setDraft(displayName);
    }
  }, [displayName, editing]);

  useEffect(() => {
    if (!editing) return;
    let cancelled = false;

    async function focusWhenReady() {
      const input = inputRef.current as
        | (HTMLElement & {
            select?: () => void;
            updateComplete?: Promise<unknown>;
          })
        | null;
      if (!input) return;
      try {
        await input.updateComplete;
        if (cancelled) return;
        input.focus();
        input.select?.();
      } catch {
        // Ignore — shadow input may not be ready; user can still type after click.
      }
    }

    const timer = window.setTimeout(() => {
      void focusWhenReady();
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [editing]);

  async function save() {
    const trimmed = draft.trim();
    const nextName = trimmed.length > 0 ? trimmed : null;
    await run(
      async () => {
        const detail = await patchImportName(importId, nextName);
        onRenamed({ name: detail.name, displayName: detail.displayName });
        setEditing(false);
      },
      { successMessage: t("imports.renameSuccess") },
    );
  }

  if (!editing) {
    return (
      <button
        type="button"
        className={className}
        style={{
          background: "none",
          border: "none",
          padding: 0,
          margin: 0,
          cursor: "pointer",
          textAlign: "left",
          font: "inherit",
          color: "inherit",
        }}
        title={t("imports.renameHint")}
        onClick={() => setEditing(true)}
      >
        <strong>{displayName}</strong>
      </button>
    );
  }

  return (
    <div className="wa-cluster wa-gap-s wa-align-items-center" style={{ flex: 1, minWidth: 0 }}>
      <wa-input
        ref={inputRef}
        value={draft}
        disabled={loading || undefined}
        style={{ flex: 1, minWidth: "12rem" }}
        onInput={(event) => {
          const target = event.target as HTMLInputElement;
          setDraft(target.value);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            void save();
          }
          if (event.key === "Escape") {
            event.preventDefault();
            setDraft(displayName);
            setEditing(false);
          }
        }}
      ></wa-input>
      <wa-button
        type="button"
        size="small"
        variant="brand"
        disabled={loading || undefined}
        onClick={() => {
          void save();
        }}
      >
        {t("imports.renameSave")}
      </wa-button>
      <wa-button
        type="button"
        size="small"
        appearance="plain"
        disabled={loading || undefined}
        onClick={() => {
          setDraft(displayName);
          setEditing(false);
        }}
      >
        {t("common.cancel")}
      </wa-button>
    </div>
  );
}
