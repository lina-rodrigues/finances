"use client";

import { useEffect, useRef, useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import {
  deleteImportKnowledgeRule,
  patchImportKnowledgeRule,
  type ImportKnowledgeRule,
} from "@/lib/api";
import { useTranslation } from "@/lib/i18n";
import { useMutationFeedback } from "@/lib/useMutationFeedback";
import { useWaDialogAfterHide } from "@/lib/useWaDialogAfterHide";

interface ImportKnowledgeListProps {
  rules: ImportKnowledgeRule[];
  onChanged: () => void | Promise<void>;
  emptyMessage: string;
}

export function ImportKnowledgeList({ rules, onChanged, emptyMessage }: ImportKnowledgeListProps) {
  const { t } = useTranslation();
  const { loading, run } = useMutationFeedback();
  const [editing, setEditing] = useState<ImportKnowledgeRule | null>(null);
  const [deleting, setDeleting] = useState<ImportKnowledgeRule | null>(null);
  const dialogRef = useRef<HTMLElement | null>(null);
  useWaDialogAfterHide(dialogRef, Boolean(editing), (open) => {
    if (!open) setEditing(null);
  });

  const [ofxName, setOfxName] = useState("");
  const [type, setType] = useState<"LineItem" | "LineItemEntry">("LineItemEntry");
  const [category, setCategory] = useState("");
  const [parent, setParent] = useState("");
  const [label, setLabel] = useState("");

  useEffect(() => {
    if (!editing) return;
    setOfxName(editing.ofxName);
    setType(editing.type);
    setCategory(editing.category);
    setParent(editing.parent ?? "");
    setLabel(editing.label ?? "");
  }, [editing]);

  async function handleSave() {
    if (!editing) return;
    await run(
      async () => {
        await patchImportKnowledgeRule(editing.id, {
          ofxName: ofxName.trim(),
          type,
          category: category.trim(),
          parent: type === "LineItemEntry" ? parent.trim() || null : null,
          label: type === "LineItem" ? label.trim() || null : null,
        });
        setEditing(null);
        await onChanged();
      },
      { successMessage: t("imports.knowledgeSaveSuccess") },
    );
  }

  async function handleDeleteConfirm() {
    if (!deleting) return;
    await run(
      async () => {
        await deleteImportKnowledgeRule(deleting.id);
        setDeleting(null);
        await onChanged();
      },
      { successMessage: t("imports.knowledgeDeleteSuccess") },
    );
  }

  if (rules.length === 0) {
    return (
      <wa-callout variant="neutral">
        <wa-icon slot="icon" name="info-circle"></wa-icon>
        {emptyMessage}
      </wa-callout>
    );
  }

  return (
    <>
      <div className="wa-stack wa-gap-s">
        {rules.map((rule) => (
          <div key={rule.id} className="list-row">
            <div className="wa-stack wa-gap-2xs" style={{ flex: 1, minWidth: 0 }}>
              <strong style={{ overflowWrap: "anywhere" }}>{rule.ofxName}</strong>
              <span className="wa-caption-m wa-color-text-quiet">
                {rule.type} · {rule.category}
                {rule.type === "LineItemEntry"
                  ? ` · ${rule.parent ?? "—"}`
                  : ` · ${rule.label ?? "—"}`}
              </span>
            </div>
            <div className="wa-cluster wa-gap-s">
              <wa-button
                type="button"
                appearance="outlined"
                size="small"
                disabled={loading || undefined}
                onClick={() => setEditing(rule)}
              >
                {t("imports.knowledgeEdit")}
              </wa-button>
              <wa-button
                type="button"
                variant="danger"
                appearance="outlined"
                size="small"
                disabled={loading || undefined}
                onClick={() => setDeleting(rule)}
              >
                <wa-icon slot="start" name="trash"></wa-icon>
                {t("imports.knowledgeDelete")}
              </wa-button>
            </div>
          </div>
        ))}
      </div>

      <wa-dialog
        ref={dialogRef}
        open={Boolean(editing) || undefined}
        label={t("imports.knowledgeEdit")}
      >
        {editing ? (
          <div className="wa-stack wa-gap-m">
            <div className="wa-stack wa-gap-2xs">
              <label className="wa-caption-m">{t("imports.knowledgeOfxName")}</label>
              <wa-input
                value={ofxName}
                onInput={(event) => setOfxName((event.target as HTMLInputElement).value)}
              ></wa-input>
            </div>
            <div className="wa-stack wa-gap-2xs">
              <label className="wa-caption-m">{t("imports.type")}</label>
              <wa-select
                value={type}
                onChange={(event) => {
                  const value = (event.target as HTMLSelectElement).value as
                    | "LineItem"
                    | "LineItemEntry";
                  setType(value);
                }}
              >
                <wa-option value="LineItem">LineItem</wa-option>
                <wa-option value="LineItemEntry">LineItemEntry</wa-option>
              </wa-select>
            </div>
            <div className="wa-stack wa-gap-2xs">
              <label className="wa-caption-m">{t("imports.category")}</label>
              <wa-input
                value={category}
                onInput={(event) => setCategory((event.target as HTMLInputElement).value)}
              ></wa-input>
            </div>
            {type === "LineItemEntry" ? (
              <div className="wa-stack wa-gap-2xs">
                <label className="wa-caption-m">{t("imports.parent")}</label>
                <wa-input
                  value={parent}
                  onInput={(event) => setParent((event.target as HTMLInputElement).value)}
                ></wa-input>
              </div>
            ) : (
              <div className="wa-stack wa-gap-2xs">
                <label className="wa-caption-m">{t("imports.label")}</label>
                <wa-input
                  value={label}
                  onInput={(event) => setLabel((event.target as HTMLInputElement).value)}
                ></wa-input>
              </div>
            )}
            <div className="wa-cluster wa-gap-s" style={{ justifyContent: "flex-end" }}>
              <wa-button
                type="button"
                appearance="plain"
                disabled={loading || undefined}
                onClick={() => setEditing(null)}
              >
                {t("common.cancel")}
              </wa-button>
              <wa-button
                type="button"
                variant="brand"
                disabled={loading || undefined}
                onClick={() => {
                  void handleSave();
                }}
              >
                {t("imports.knowledgeSave")}
              </wa-button>
            </div>
          </div>
        ) : null}
      </wa-dialog>

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title={t("imports.knowledgeDelete")}
        description={t("imports.knowledgeDeleteDescription")}
        confirmLabel={t("imports.knowledgeDelete")}
        loading={loading}
        onConfirm={() => {
          void handleDeleteConfirm();
        }}
      />
    </>
  );
}
