"use client";

import { useCallback, useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ReportDetailDialog } from "@/components/ReportDetailDialog";
import {
  deleteReport,
  fetchReports,
  generateReport,
  type FinancialReportSummary,
} from "@/lib/api";
import { useTranslation, translateReportError } from "@/lib/i18n";
import { useMutationFeedback } from "@/lib/useMutationFeedback";

interface AiAssistantSectionProps {
  yearMonth: string;
}

function formatReportDate(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

function statusTone(status: FinancialReportSummary["status"]): string {
  if (status === "completed") return "metric-amount--income";
  if (status === "failed") return "metric-amount--expense";
  return "wa-color-text-quiet";
}

export function AiAssistantSection({ yearMonth }: AiAssistantSectionProps) {
  const { t, locale } = useTranslation();
  const { loading: mutating, run } = useMutationFeedback();
  const [reports, setReports] = useState<FinancialReportSummary[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [listOpen, setListOpen] = useState(true);
  const [deletingReport, setDeletingReport] = useState<FinancialReportSummary | null>(null);
  const [viewingReportId, setViewingReportId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const localeTag = locale === "pt" ? "pt-BR" : "en-US";
  const hasPendingReports = reports.some((report) => report.status === "pending");

  const loadReports = useCallback(async () => {
    setLoadingReports(true);
    try {
      const data = await fetchReports(yearMonth);
      setReports(data);
    } finally {
      setLoadingReports(false);
    }
  }, [yearMonth]);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  useEffect(() => {
    if (!hasPendingReports) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void loadReports();
    }, 2500);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [hasPendingReports, loadReports]);

  function openReport(report: FinancialReportSummary) {
    setViewingReportId(report.id);
    setDetailOpen(true);
  }

  async function handleGenerate() {
    await run(
      async () => {
        const report = await generateReport(yearMonth);
        await loadReports();
        setListOpen(true);
        if (report.status !== "completed") {
          throw new Error(report.error ?? "REPORT_GENERATION_FAILED");
        }
      },
      {
        successMessage: t("reports.generateSuccess"),
      },
    );
  }

  async function handleDeleteConfirm() {
    if (!deletingReport) {
      return;
    }

    const reportId = deletingReport.id;
    await run(
      async () => {
        await deleteReport(reportId);
        setDeletingReport(null);
        if (viewingReportId === reportId) {
          setDetailOpen(false);
          setViewingReportId(null);
        }
        await loadReports();
      },
      {
        successMessage: t("reports.reportDeleted"),
      },
    );
  }

  return (
    <>
      <section className="wa-stack wa-gap-m">
        <div className="wa-cluster wa-gap-s wa-align-items-center">
          <h2 className="wa-heading-s" style={{ marginInlineEnd: "auto" }}>
            {t("reports.aiAssistantTitle")}
          </h2>
          <wa-button
            type="button"
            variant="brand"
            disabled={mutating || undefined}
            onClick={() => void handleGenerate()}
          >
            {mutating && !deletingReport ? (
              <wa-spinner slot="start" style={{ fontSize: "0.875rem" }}></wa-spinner>
            ) : (
              <wa-icon slot="start" name="sparkles"></wa-icon>
            )}
            {t("reports.generateReport")}
          </wa-button>
        </div>

        <wa-details
          open={listOpen}
          onWaShow={() => setListOpen(true)}
          onWaHide={() => setListOpen(false)}
        >
          <span slot="summary">{t("reports.generatedReports")}</span>

          <div className="wa-stack wa-gap-s">
            {loadingReports && (
              <p className="wa-caption-m wa-color-text-quiet">{t("common.loading")}</p>
            )}

            {!loadingReports && reports.length === 0 && (
              <wa-callout variant="neutral">
                <wa-icon slot="icon" name="file-lines"></wa-icon>
                {t("reports.noReports")}
              </wa-callout>
            )}

            {!loadingReports &&
              reports.map((report) => (
                <div key={report.id} className="list-row" style={{ position: "relative" }}>
                  <button
                    type="button"
                    className="wa-stack wa-gap-2xs"
                    style={{
                      flex: 1,
                      minWidth: 0,
                      border: 0,
                      background: "transparent",
                      padding: 0,
                      textAlign: "left",
                      color: "inherit",
                      font: "inherit",
                      cursor: "pointer",
                    }}
                    onClick={() => openReport(report)}
                  >
                    <div
                      className="wa-cluster wa-gap-s"
                      style={{ justifyContent: "space-between", width: "100%" }}
                    >
                      <span
                        className="wa-caption-m"
                        style={{ fontWeight: "var(--wa-font-weight-semibold)", minWidth: 0 }}
                      >
                        {report.title}
                      </span>
                      <span className={`wa-caption-s ${statusTone(report.status)}`}>
                        {t(`reports.status.${report.status}`)}
                      </span>
                    </div>
                    <span className="wa-caption-s wa-color-text-quiet">
                      {formatReportDate(report.createdAt, localeTag)}
                    </span>
                    {report.status === "failed" && report.error && (
                      <span className="wa-caption-s metric-amount--expense">
                        {translateReportError(report.error, locale)}
                      </span>
                    )}
                  </button>
                  <wa-button
                    type="button"
                    appearance="plain"
                    size="s"
                    variant="danger"
                    aria-label={t("reports.deleteReport")}
                    disabled={mutating || undefined}
                    onClick={() => setDeletingReport(report)}
                  >
                    <wa-icon name="trash"></wa-icon>
                  </wa-button>
                </div>
              ))}
          </div>
        </wa-details>
      </section>

      <ReportDetailDialog
        reportId={viewingReportId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />

      <ConfirmDialog
        open={deletingReport !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setDeletingReport(null);
          }
        }}
        title={t("reports.deleteReport")}
        description={
          deletingReport
            ? t("reports.deleteReportDescription", {
                title: deletingReport.title,
              })
            : undefined
        }
        loading={mutating}
        onConfirm={() => void handleDeleteConfirm()}
      />
    </>
  );
}
