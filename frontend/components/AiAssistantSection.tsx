"use client";

import { useCallback, useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Icon } from "@/components/Icon";
import { Button } from "@/components/ui/pixelact-ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/pixelact-ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/pixelact-ui/collapsible";
import { ReportMarkdown } from "@/components/ReportMarkdown";
import { Spinner } from "@/components/ui/pixelact-ui/spinner";
import { deleteReport, fetchReports, generateReport, type FinancialReport } from "@/lib/api";
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

export function AiAssistantSection({ yearMonth }: AiAssistantSectionProps) {
  const { t, locale } = useTranslation();
  const { loading: mutating, run } = useMutationFeedback();
  const [reports, setReports] = useState<FinancialReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [listOpen, setListOpen] = useState(true);
  const [deletingReport, setDeletingReport] = useState<FinancialReport | null>(null);

  const localeTag = locale === "pt" ? "pt-BR" : "en-US";

  const loadReports = useCallback(async () => {
    setLoadingReports(true);
    try {
      const data = await fetchReports(yearMonth);
      setReports(data);
      setSelectedReportId((current) => {
        if (current && data.some((report) => report.id === current)) {
          return current;
        }
        return data[0]?.id ?? null;
      });
    } finally {
      setLoadingReports(false);
    }
  }, [yearMonth]);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  const selectedReport = reports.find((report) => report.id === selectedReportId) ?? null;

  async function handleGenerate() {
    await run(async () => {
      const report = await generateReport(yearMonth);
      await loadReports();
      setSelectedReportId(report.id);
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
                  className={`interactive-row inventory-slot flex items-center gap-1 p-1 ${
                    selectedReportId === report.id ? "ring-2 ring-ring" : ""
                  }`}
                >
                  <button
                    type="button"
                    className="min-w-0 flex-1 p-2 text-left"
                    onClick={() => setSelectedReportId(report.id)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-body text-sm font-semibold">
                        {formatReportDate(report.createdAt, localeTag)}
                      </span>
                      <span
                        className={`text-body text-xs ${
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

        {selectedReport && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-display text-xs">{t("reports.reportDetail")}</CardTitle>
              <Button
                type="button"
                variant="link"
                size="sm"
                className="pressable focus-ring h-auto gap-1 p-1 text-expense"
                disabled={mutating}
                onClick={() => setDeletingReport(selectedReport)}
              >
                <Icon name="delete" size="xs" colorClass="text-expense" />
                <span className="text-body text-xs">{t("reports.deleteReport")}</span>
              </Button>
            </CardHeader>
            <CardContent className="pt-0">
              {selectedReport.status === "completed" && selectedReport.content && (
                <ReportMarkdown content={selectedReport.content} />
              )}
              {selectedReport.status === "failed" && (
                <p className="text-body text-sm text-expense">
                  {translateReportError(selectedReport.error, locale)}
                </p>
              )}
              {selectedReport.status === "pending" && (
                <p className="text-muted-finance text-body text-sm">{t("reports.reportPending")}</p>
              )}
            </CardContent>
          </Card>
        )}
      </section>

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
                date: formatReportDate(deletingReport.createdAt, localeTag),
              })
            : undefined
        }
        loading={mutating}
        onConfirm={() => void handleDeleteConfirm()}
      />
    </>
  );
}
