"use client";

import { useEffect, useState } from "react";
import { ReportMarkdown } from "@/components/ReportMarkdown";
import { fetchReport, type FinancialReport } from "@/lib/api";
import { downloadReportDocx, reportDownloadFilename } from "@/lib/downloadReport";
import { useTranslation, translateReportError } from "@/lib/i18n";

import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Spinner,
  useToast,
} from "@lina-rodrigues/cotton-candy";
interface ReportDetailDialogProps {
  reportId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReportDetailDialog({ reportId, open, onOpenChange }: ReportDetailDialogProps) {
  const { t, locale } = useTranslation();
  const { showToast } = useToast();
  const [report, setReport] = useState<FinancialReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!open || !reportId) {
      setReport(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    void fetchReport(reportId)
      .then((data) => {
        if (!cancelled) {
          setReport(data);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open, reportId]);

  const canDownload = report?.status === "completed" && Boolean(report.content?.trim());

  async function handleDownloadDocx() {
    if (!report || !canDownload) {
      return;
    }

    setDownloading(true);
    try {
      const filename = reportDownloadFilename(report.title);
      await downloadReportDocx(report.id, filename);
    } catch (error) {
      console.error(error);
      showToast(t("reports.downloadFailed"), "error");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="dialog-content-frame-report flex flex-col gap-4 overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="text-display text-xs normal-case">
            {report?.title ?? t("reports.reportDetail")}
          </DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-2">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Spinner className="size-6" />
            </div>
          )}

          {!loading && report?.status === "completed" && report.content && (
            <ReportMarkdown content={report.content} />
          )}

          {!loading && report?.status === "failed" && (
            <p className="text-body text-sm text-expense">
              {translateReportError(report.error, locale)}
            </p>
          )}

          {!loading && report?.status === "pending" && (
            <p className="text-muted-finance text-body text-sm">{t("reports.reportPending")}</p>
          )}
        </div>

        <DialogFooter className="flex flex-col-reverse gap-2 px-6 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {canDownload && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="pressable focus-ring gap-1"
                disabled={downloading}
                onClick={() => void handleDownloadDocx()}
              >
                {downloading ? <Spinner className="size-4" /> : null}
                {t("reports.downloadDocx")}
              </Button>
            )}
          </div>
          <Button type="button" variant="secondary" size="sm" onClick={() => onOpenChange(false)}>
            {t("common.close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
