"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ImportKnowledgeList } from "@/components/ImportKnowledgeList";
import { PageTitle } from "@/components/PageTitle";
import {
  executeImportBatchKnowledge,
  fetchImport,
  fetchImportBatchKnowledge,
  importDisplayName,
  type ImportBatchKnowledgeResponse,
  type ImportBatchSummary,
} from "@/lib/api";
import { translateError, useTranslation } from "@/lib/i18n";
import { useMutationFeedback } from "@/lib/useMutationFeedback";

export function ImportBatchKnowledgePage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { t, locale } = useTranslation();
  const { loading: mutating, run } = useMutationFeedback();
  const [batch, setBatch] = useState<ImportBatchSummary | null>(null);
  const [knowledge, setKnowledge] = useState<ImportBatchKnowledgeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [detail, batchKnowledge] = await Promise.all([
        fetchImport(id),
        fetchImportBatchKnowledge(id),
      ]);
      setBatch(detail);
      setKnowledge(batchKnowledge);
      setMissing(false);
    } catch {
      setMissing(true);
      setBatch(null);
      setKnowledge(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const pending = knowledge?.knowledgeStatus === "pending";

  useEffect(() => {
    if (!pending) return;
    const timer = window.setInterval(() => {
      void load();
    }, 2500);
    return () => window.clearInterval(timer);
  }, [pending, load]);

  async function handleExecute() {
    await run(
      async () => {
        const next = await executeImportBatchKnowledge(id);
        setKnowledge(next);
        await load();
      },
      { successMessage: t("imports.knowledgeExecuteSuccess") },
    );
  }

  if (loading && !knowledge && !batch) {
    return (
      <p className="wa-caption-m wa-color-text-quiet">
        <wa-spinner style={{ fontSize: "1rem" }}></wa-spinner>
      </p>
    );
  }

  if (missing || !batch) {
    return <wa-callout variant="danger">{t("errors.IMPORT_NOT_FOUND")}</wa-callout>;
  }

  const status = knowledge?.knowledgeStatus ?? "idle";
  const rules = knowledge?.rules ?? [];
  const notConfirmed = batch.status !== "done" && status === "idle";
  const canExecute =
    batch.status === "done" && status !== "pending" && rules.length === 0;

  return (
    <div className="wa-stack wa-gap-xl">
      <div className="wa-cluster wa-gap-m wa-align-items-center">
        <Link href={`/imports/${id}`}>
          <wa-button type="button" appearance="plain" size="small">
            <wa-icon slot="start" name="arrow-left"></wa-icon>
            {t("imports.reviewTitle")}
          </wa-button>
        </Link>
      </div>

      <PageTitle>{t("imports.knowledgeBatchTitle")}</PageTitle>
      <p className="wa-caption-m wa-color-text-quiet" style={{ margin: 0 }}>
        {importDisplayName(batch)} · {batch.yearMonth}
      </p>

      {notConfirmed ? (
        <wa-callout variant="neutral">
          <wa-icon slot="icon" name="info-circle"></wa-icon>
          {t("imports.knowledgeNotConfirmed")}
        </wa-callout>
      ) : null}

      {status === "pending" ? (
        <wa-callout variant="neutral">
          <wa-icon slot="icon" name="info-circle"></wa-icon>
          {t("imports.knowledgePendingHint")}
        </wa-callout>
      ) : null}

      {status === "failed" ? (
        <wa-callout variant="danger">
          <wa-icon slot="icon" name="exclamation-triangle"></wa-icon>
          {t("imports.knowledgeFailedHint")}
          {knowledge?.error ? ` (${translateError(knowledge.error, locale)})` : ""}
        </wa-callout>
      ) : null}

      {canExecute ? (
        <div className="wa-stack wa-gap-m">
          <wa-callout variant="neutral">
            <wa-icon slot="icon" name="info-circle"></wa-icon>
            {t("imports.knowledgeExecuteHint")}
          </wa-callout>
          <wa-button
            type="button"
            variant="brand"
            disabled={mutating || undefined}
            onClick={() => {
              void handleExecute();
            }}
          >
            <wa-icon slot="start" name="play"></wa-icon>
            {t("imports.knowledgeExecute")}
          </wa-button>
        </div>
      ) : null}

      {knowledge && !canExecute ? (
        <ImportKnowledgeList
          rules={rules}
          onChanged={load}
          emptyMessage={
            status === "pending"
              ? t("imports.knowledgePendingEmpty")
              : notConfirmed
                ? t("imports.knowledgeNotConfirmed")
                : t("imports.knowledgeBatchEmpty")
          }
        />
      ) : null}
    </div>
  );
}
