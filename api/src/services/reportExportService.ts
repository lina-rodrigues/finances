import { convertMarkdownToBuffer } from "@mohtasham/md-to-docx";
import type { IFinancialReport } from "../models/FinancialReport.js";

export function buildReportExportMarkdown(report: Pick<IFinancialReport, "title" | "content">): string {
  const body = report.content?.trim() ?? "";
  return `# ${report.title.trim()}\n\n${body}`;
}

export function reportDownloadFilename(title: string, extension: "docx" | "pdf"): string {
  const base =
    title
      .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "")
      .trim()
      .replace(/\s+/g, " ")
      .slice(0, 100) || "financial-report";
  return `${base}.${extension}`;
}

export function contentDispositionHeader(filename: string): string {
  const asciiFallback = filename.replace(/[^\x20-\x7E]/g, "_");
  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

export async function buildReportDocxBuffer(report: Pick<IFinancialReport, "title" | "content">): Promise<Buffer> {
  const markdown = buildReportExportMarkdown(report);
  return convertMarkdownToBuffer(markdown);
}
