"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ImportNameEditor } from "@/components/ImportNameEditor";
import { PageTitle } from "@/components/PageTitle";
import {
  deleteImport,
  fetchImports,
  importDisplayName,
  uploadImport,
  type ImportBatchStatus,
  type ImportBatchSummary,
} from "@/lib/api";
import { useTranslation } from "@/lib/i18n";
import { useMutationFeedback } from "@/lib/useMutationFeedback";

function statusTone(status: ImportBatchStatus): string {
  if (status === "done") return "metric-amount--income";
  if (status === "failed") return "metric-amount--expense";
  if (status === "waiting") return "wa-color-warning-on-normal";
  return "wa-color-text-quiet";
}

function currentYearMonth(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${now.getFullYear()}-${month}`;
}

export function ImportsPage() {
  const { t, locale } = useTranslation();
  const { loading: mutating, run } = useMutationFeedback();
  const [batches, setBatches] = useState<ImportBatchSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [yearMonth, setYearMonth] = useState(currentYearMonth);
  const [deleting, setDeleting] = useState<ImportBatchSummary | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const localeTag = locale === "pt" ? "pt-BR" : "en-US";
  const hasPending = batches.some(
    (batch) => batch.status === "pending" || batch.knowledgeStatus === "pending",
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setBatches(await fetchImports());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!hasPending) return;
    const id = window.setInterval(() => {
      void load();
    }, 2500);
    return () => window.clearInterval(id);
  }, [hasPending, load]);

  const sorted = useMemo(
    () => [...batches].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [batches],
  );

  async function handleFileChange(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;
    await run(
      async () => {
        await uploadImport(file, yearMonth);
        await load();
      },
      { successMessage: t("imports.uploadSuccess") },
    );
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function handleDeleteConfirm() {
    if (!deleting) return;
    const id = deleting.id;
    await run(
      async () => {
        await deleteImport(id);
        setDeleting(null);
        await load();
      },
      { successMessage: t("imports.deleteSuccess") },
    );
  }

  return (
    <div className="wa-stack wa-gap-xl">
      <PageTitle>{t("imports.title")}</PageTitle>

      <div className="wa-cluster wa-gap-m wa-align-items-end">
        <div className="wa-stack wa-gap-2xs">
          <label className="wa-caption-m" htmlFor="import-year-month">
            {t("imports.yearMonth")}
          </label>
          <wa-input
            id="import-year-month"
            type="month"
            value={yearMonth}
            onInput={(event) => {
              const target = event.target as HTMLInputElement;
              setYearMonth(target.value);
            }}
          ></wa-input>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".ofx,application/x-ofx,application/xml,text/xml"
          hidden
          onChange={(event) => {
            void handleFileChange(event.target.files);
          }}
        />
        <wa-button
          type="button"
          variant="brand"
          disabled={mutating || undefined}
          onClick={() => fileInputRef.current?.click()}
        >
          <wa-icon slot="start" name="upload"></wa-icon>
          {t("imports.upload")}
        </wa-button>
        <Link href="/imports/knowledge">
          <wa-button type="button" appearance="outlined" disabled={mutating || undefined}>
            <wa-icon slot="start" name="book"></wa-icon>
            {t("imports.knowledge")}
          </wa-button>
        </Link>
      </div>

      {loading ? (
        <p className="wa-caption-m wa-color-text-quiet">
          <wa-spinner style={{ fontSize: "1rem" }}></wa-spinner>
        </p>
      ) : sorted.length === 0 ? (
        <wa-callout variant="neutral">
          <wa-icon slot="icon" name="info-circle"></wa-icon>
          {t("imports.empty")}
        </wa-callout>
      ) : (
        <div className="wa-stack wa-gap-s">
          {sorted.map((batch) => {
            const canDelete = batch.status !== "done";
            return (
              <div key={batch.id} className="list-row">
                <div className="wa-stack wa-gap-2xs" style={{ flex: 1, minWidth: 0 }}>
                  <div className="wa-cluster wa-gap-s wa-align-items-center">
                    <ImportNameEditor
                      importId={batch.id}
                      displayName={importDisplayName(batch)}
                      onRenamed={({ name, displayName }) => {
                        setBatches((prev) =>
                          prev.map((row) =>
                            row.id === batch.id ? { ...row, name, displayName } : row,
                          ),
                        );
                      }}
                    />
                    <span className={statusTone(batch.status)}>
                      {t(`imports.status.${batch.status}`)}
                    </span>
                  </div>
                  <span className="wa-caption-m wa-color-text-quiet">
                    {batch.yearMonth} ·{" "}
                    {new Intl.DateTimeFormat(localeTag, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(new Date(batch.createdAt))}
                  </span>
                  <span className="wa-caption-m wa-color-text-quiet">
                    {t("imports.sourceCount", { count: String(batch.sourceCount) })}
                    {batch.duplicateCount > 0
                      ? ` · ${t("imports.duplicateCount", { count: String(batch.duplicateCount) })}`
                      : ""}
                    {batch.proposedCount > 0
                      ? ` · ${t("imports.proposedCount", { count: String(batch.proposedCount) })}`
                      : ""}
                  </span>
                </div>
                <div className="wa-cluster wa-gap-s">
                  <Link href={`/imports/${batch.id}`}>
                    <wa-button type="button" appearance="outlined" size="small">
                      {t("imports.open")}
                    </wa-button>
                  </Link>
                  <Link href={`/imports/${batch.id}/knowledge`}>
                    <wa-button type="button" appearance="outlined" size="small">
                      {t("imports.knowledge")}
                    </wa-button>
                  </Link>
                  {canDelete ? (
                    <wa-button
                      type="button"
                      variant="danger"
                      appearance="outlined"
                      size="small"
                      disabled={mutating || undefined}
                      onClick={() => setDeleting(batch)}
                    >
                      <wa-icon slot="start" name="trash"></wa-icon>
                      {t("imports.delete")}
                    </wa-button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title={t("imports.delete")}
        description={t("imports.deleteDescription")}
        confirmLabel={t("imports.delete")}
        loading={mutating}
        onConfirm={() => {
          void handleDeleteConfirm();
        }}
      />
    </div>
  );
}
