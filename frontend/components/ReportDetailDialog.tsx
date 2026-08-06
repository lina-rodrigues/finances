"use client";

import { useEffect, useRef, useState } from "react";
import { ReportMarkdown } from "@/components/ReportMarkdown";
import { fetchReport, type FinancialReport } from "@/lib/api";
import { downloadReportDocx, reportDownloadFilename } from "@/lib/downloadReport";
import { useTranslation, translateReportError } from "@/lib/i18n";
import { showToast } from "@/lib/toast";

interface ReportDetailDialogProps {
  reportId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReportDetailDialog({ reportId, open, onOpenChange }: ReportDetailDialogProps) {
  const { t, locale } = useTranslation();
  const dialogRef = useRef<HTMLElement | null>(null);
  const openRef = useRef(open);
  openRef.current = open;
  const [report, setReport] = useState<FinancialReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    const onAfterHide = () => {
      if (openRef.current) onOpenChange(false);
    };
    el.addEventListener("wa-after-hide", onAfterHide);
    return () => el.removeEventListener("wa-after-hide", onAfterHide);
  }, [onOpenChange]);

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
  const title = report?.title ?? t("reports.reportDetail");

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
      void showToast(t("reports.downloadFailed"), { variant: "danger" });
    } finally {
      setDownloading(false);
    }
  }

  return (
    <wa-dialog
      ref={dialogRef}
      label={title}
      open={open || undefined}
      light-dismiss
      style={{ "--width": "44rem" } as React.CSSProperties}
    >
      <div className="wa-stack wa-gap-m" style={{ minHeight: "8rem" }}>
        {loading ? (
          <div className="wa-cluster wa-gap-s wa-align-items-center" style={{ justifyContent: "center", padding: "var(--wa-space-xl) 0" }}>
            <wa-spinner style={{ fontSize: "1.5rem" }}></wa-spinner>
          </div>
        ) : null}

        {!loading && report?.status === "completed" && report.content ? (
          <ReportMarkdown content={report.content} />
        ) : null}

        {!loading && report?.status === "failed" ? (
          <p className="wa-caption-m metric-amount--expense" style={{ margin: 0 }}>
            {translateReportError(report.error, locale)}
          </p>
        ) : null}

        {!loading && report?.status === "pending" ? (
          <p className="wa-caption-l wa-color-text-quiet" style={{ margin: 0 }}>
            {t("reports.reportPending")}
          </p>
        ) : null}
      </div>

      <div slot="footer" className="wa-cluster wa-gap-s" style={{ justifyContent: "space-between", width: "100%" }}>
        <div className="wa-cluster wa-gap-s">
          {canDownload ? (
            <wa-button
              type="button"
              variant="neutral"
              appearance="outlined"
              size="s"
              loading={downloading || undefined}
              disabled={downloading || undefined}
              onClick={() => void handleDownloadDocx()}
            >
              <wa-icon slot="start" name="download"></wa-icon>
              {t("reports.downloadDocx")}
            </wa-button>
          ) : null}
        </div>
        <wa-button
          type="button"
          variant="neutral"
          appearance="outlined"
          size="s"
          onClick={() => onOpenChange(false)}
        >
          {t("common.close")}
        </wa-button>
      </div>
    </wa-dialog>
  );
}
