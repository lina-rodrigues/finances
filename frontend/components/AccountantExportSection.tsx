"use client";

import { downloadMonthWorkbook } from "@/lib/downloadMonthWorkbook";
import { useTranslation } from "@/lib/i18n";
import { useMutationFeedback } from "@/lib/useMutationFeedback";

interface AccountantExportSectionProps {
  yearMonth: string;
}

export function AccountantExportSection({ yearMonth }: AccountantExportSectionProps) {
  const { t, locale } = useTranslation();
  const { loading, run } = useMutationFeedback();

  async function handleDownload() {
    await run(
      async () => {
        await downloadMonthWorkbook(yearMonth, locale);
      },
      {
        successMessage: t("reports.accountantExportSuccess"),
        errorMessage: t("reports.accountantExportFailed"),
      },
    );
  }

  return (
    <section className="wa-stack wa-gap-m">
      <h2 className="wa-heading-s">{t("reports.accountantExportTitle")}</h2>
      <wa-card>
        <div className="wa-stack wa-gap-m">
          <p className="wa-caption-m wa-color-text-quiet" style={{ margin: 0 }}>
            {t("reports.accountantExportDescription")}
          </p>
          <wa-button
            type="button"
            variant="neutral"
            appearance="outlined"
            disabled={loading || undefined}
            onClick={() => void handleDownload()}
          >
            {loading ? (
              <wa-spinner slot="start" style={{ fontSize: "0.875rem" }}></wa-spinner>
            ) : (
              <wa-icon slot="start" name="download"></wa-icon>
            )}
            {t("reports.accountantExportDownload")}
          </wa-button>
        </div>
      </wa-card>
    </section>
  );
}
