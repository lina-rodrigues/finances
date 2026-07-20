"use client";

import { useCallback, useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { Button } from "@/components/ui/pixelact-ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/pixelact-ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/pixelact-ui/collapsible";
import { Spinner } from "@/components/ui/pixelact-ui/spinner";
import { fetchReports, generateReport, type FinancialReport } from "@/lib/api";
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
  const { loading: generating, run } = useMutationFeedback();
  const [reports, setReports] = useState<FinancialReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [listOpen, setListOpen] = useState(true);

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

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-display text-sm">{t("reports.aiAssistantTitle")}</h2>
        <Button
          type="button"
          variant="default"
          size="sm"
          className="pressable focus-ring gap-1"
          onClick={() => void handleGenerate()}
          disabled={generating}
        >
          {generating ? <Spinner className="size-4" /> : <Icon name="navReports" size="xs" />}
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
              <button
                key={report.id}
                type="button"
                className={`interactive-row inventory-slot w-full p-3 text-left ${
                  selectedReportId === report.id ? "ring-2 ring-ring" : ""
                }`}
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
            ))}
        </CollapsibleContent>
      </Collapsible>

      {selectedReport && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-display text-xs">{t("reports.reportDetail")}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {selectedReport.status === "completed" && selectedReport.content && (
              <div className="text-body whitespace-pre-wrap text-sm">{selectedReport.content}</div>
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
  );
}
