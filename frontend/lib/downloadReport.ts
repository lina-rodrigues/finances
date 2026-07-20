import { getApiUrl } from "@/lib/api";

export function reportDownloadFilename(title: string, extension: "docx" | "pdf"): string {
  const base =
    title
      .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "")
      .trim()
      .replace(/\s+/g, " ")
      .slice(0, 100) || "financial-report";
  return `${base}.${extension}`;
}

function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export async function downloadReportDocx(reportId: string, filename: string): Promise<void> {
  const res = await fetch(`${getApiUrl()}/reports/${reportId}/export/docx`, {
    credentials: "include",
  });

  if (res.status === 401 && typeof window !== "undefined") {
    window.location.href = "/login";
    return;
  }

  if (!res.ok) {
    throw new Error("REPORT_DOWNLOAD_FAILED");
  }

  const blob = await res.blob();
  triggerBlobDownload(blob, filename);
}

export async function downloadReportPdfFromElement(
  element: HTMLElement,
  filename: string,
): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait" });

  await new Promise<void>((resolve, reject) => {
    pdf.html(element, {
      callback: (doc) => {
        try {
          doc.save(filename);
          resolve();
        } catch (error) {
          reject(error);
        }
      },
      margin: [36, 36, 36, 36],
      autoPaging: "text",
      html2canvas: {
        scale: 0.85,
        useCORS: true,
        logging: false,
      },
      width: 523,
    });
  });
}
