import { Agent, type RunResult } from "@cursor/sdk";
import {
  REPORT_ERROR_CODES,
  ReportServiceError,
} from "../constants/reportErrors.js";
import { readCursorApiKey } from "./cursorAi.js";

function getCursorApiKey(): string {
  const apiKey = readCursorApiKey();
  if (!apiKey) {
    throw new ReportServiceError(REPORT_ERROR_CODES.SERVICE_UNAVAILABLE);
  }
  return apiKey;
}

function extractAssistantText(result: RunResult): string {
  if (result.status === "error") {
    console.error("Cursor report agent error:", result.error);
    throw new ReportServiceError(REPORT_ERROR_CODES.GENERATION_FAILED);
  }

  if (result.result?.trim()) {
    return result.result.trim();
  }

  console.error("Cursor report agent returned an empty response");
  throw new ReportServiceError(REPORT_ERROR_CODES.GENERATION_FAILED);
}

export async function generateCursorReport(fullPrompt: string): Promise<string> {
  try {
    // Cloud agents: no local filesystem or repo needed. Local mode writes an
    // on-disk agent store under ~/.cursor, which fails on Vercel's read-only FS.
    const result = await Agent.prompt(fullPrompt, {
      apiKey: getCursorApiKey(),
      model: { id: "composer-2.5" },
      name: "Financial health report",
      cloud: {},
    });

    return extractAssistantText(result);
  } catch (error) {
    if (error instanceof ReportServiceError) {
      throw error;
    }
    console.error("Cursor report generation failed:", error);
    throw new ReportServiceError(REPORT_ERROR_CODES.GENERATION_FAILED);
  }
}
