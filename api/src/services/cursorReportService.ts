import path from "node:path";
import { fileURLToPath } from "node:url";
import { Agent, type RunResult } from "@cursor/sdk";
import {
  REPORT_ERROR_CODES,
  ReportServiceError,
} from "../constants/reportErrors.js";

const apiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function getCursorApiKey(): string {
  const apiKey = process.env.CURSOR_API_KEY?.trim();
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
    const result = await Agent.prompt(fullPrompt, {
      apiKey: getCursorApiKey(),
      model: { id: "composer-2.5" },
      local: { cwd: apiRoot },
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
