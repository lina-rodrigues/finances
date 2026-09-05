import { getApiUrl } from "@/lib/api";
import type { Locale } from "@/lib/i18n";

export function monthWorkbookFilename(yearMonth: string, language: Locale): string {
  const base = language === "pt" ? "financas" : "finance";
  return `${base}-${yearMonth}.xlsx`;
}

function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export async function downloadMonthWorkbook(yearMonth: string, language: Locale): Promise<void> {
  const res = await fetch(
    `${getApiUrl()}/reports/export/xlsx?yearMonth=${encodeURIComponent(yearMonth)}`,
    { credentials: "include" },
  );

  if (res.status === 401 && typeof window !== "undefined") {
    window.location.href = "/login";
    return;
  }

  if (!res.ok) {
    throw new Error("REPORT_DOWNLOAD_FAILED");
  }

  const blob = await res.blob();
  triggerBlobDownload(blob, monthWorkbookFilename(yearMonth, language));
}
