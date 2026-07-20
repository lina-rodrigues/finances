"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function normalizeReportMarkdown(content: string): string {
  const trimmed = content.trim();
  const fenced = trimmed.match(/^```(?:markdown|md)?\r?\n([\s\S]*?)\r?\n```$/);
  return fenced ? fenced[1].trim() : trimmed;
}

interface ReportMarkdownProps {
  content: string;
}

export function ReportMarkdown({ content }: ReportMarkdownProps) {
  return (
    <div className="report-markdown">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{normalizeReportMarkdown(content)}</ReactMarkdown>
    </div>
  );
}
