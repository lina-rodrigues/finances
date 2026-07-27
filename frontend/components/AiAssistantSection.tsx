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

import {
  Button,
  Card,
  CardContent,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Spinner,
  Icon,
} from "@lina-rodrigues/cotton-candy";
interface AiAssistantSectionProps {
  yearMonth: string;
}

function formatReportDate(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
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
    await run(async () => {
      const report = await generateReport(yearMonth);
      await loadReports();
      setListOpen(true);
      if (report.status !== "completed") {
        throw new Error(report.error ?? "REPORT_GENERATION_FAILED");
      }
    }, {
      successMessage: t("reports.generateSuccess"),
    });
  }

  async function handleDeleteConfirm() {
    if (!deletingReport) {
      return;
    }

    const reportId = deletingReport.id;
    await run(async () => {
      await deleteReport(reportId);
      setDeletingReport(null);
      if (viewingReportId === reportId) {
        setDetailOpen(false);
        setViewingReportId(null);
      }
      await loadReports();
    }, {
      successMessage: t("reports.reportDeleted"),
    });
  }

  return (
    <>
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-display text-sm">{t("reports.aiAssistantTitle")}</h2>
          <Button
            type="button"
            variant="default"
            size="sm"
            className="pressable focus-ring gap-1"
            onClick={() => void handleGenerate()}
            disabled={mutating}
          >
            {mutating && !deletingReport ? (
              <Spinner className="size-4" />
            ) : (
              <Icon name="navReports" size="xs" />
            )}
            {t("reports.generateReport")}
          </Button>
        </div>

        <Collapsible open={listOpen} onOpenChange={setListOpen}>
          <CollapsibleTrigger asChild>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="pressable focus-ring w-full justify-between"
            >
              <span>{t("reports.generatedReports")}</span>
              <Icon name={listOpen ? "arrowUp" : "chevronDown"} size="xs" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 space-y-2">
            {loadingReports && (
              <p className="text-muted-finance text-body text-sm">{t("common.loading")}</p>
            )}

            {!loadingReports && reports.length === 0 && (
              <Card>
                <CardContent className="p-4">
                  <p className="text-muted-finance text-body text-sm">{t("reports.noReports")}</p>
                </CardContent>
              </Card>
            )}

            {!loadingReports &&
              reports.map((report) => (
                <div
                  key={report.id}
                  className="interactive-row inventory-slot flex items-center gap-1 p-1"
                >
                  <button
                    type="button"
                    className="min-w-0 flex-1 p-2 text-left"
                    onClick={() => openReport(report)}
                  >
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                      <span className="text-body text-sm leading-snug font-semibold break-words">
                        {report.title}
                      </span>
                      <span
                        className={`text-body shrink-0 text-xs ${
                          report.status === "completed"
                            ? "text-income"
                            : report.status === "failed"
                              ? "text-expense"
                              : "text-planned"
                        }`}
                      >
                        {t(`reports.status.${report.status}`)}
                      </span>
                    </div>
                    <span className="text-muted-finance text-body mt-1 block text-xs">
                      {formatReportDate(report.createdAt, localeTag)}
                    </span>
                    {report.status === "failed" && report.error && (
                      <span className="text-body mt-1 block text-xs text-expense">
                        {translateReportError(report.error, locale)}
                      </span>
                    )}
                  </button>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="pressable focus-ring h-auto shrink-0 p-2"
                    aria-label={t("reports.deleteReport")}
                    disabled={mutating}
                    onClick={() => setDeletingReport(report)}
                  >
                    <Icon name="delete" size="xs" colorClass="text-expense" />
                  </Button>
                </div>
              ))}
          </CollapsibleContent>
        </Collapsible>
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
