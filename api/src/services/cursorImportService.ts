import { Agent, type RunResult } from "@cursor/sdk";
import { IMPORT_ERROR_CODES, ImportServiceError } from "../constants/importErrors.js";

function getCursorApiKey(): string {
  const apiKey = process.env.CURSOR_API_KEY?.trim();
  if (!apiKey) {
    throw new ImportServiceError(IMPORT_ERROR_CODES.SERVICE_UNAVAILABLE, 503);
  }
  return apiKey;
}

function extractAssistantText(result: RunResult): string {
  if (result.status === "error") {
    console.error("Cursor import agent error:", result.error);
    throw new ImportServiceError(IMPORT_ERROR_CODES.GENERATION_FAILED, 502);
  }

  if (result.result?.trim()) {
    return result.result.trim();
  }

  console.error("Cursor import agent returned an empty response");
  throw new ImportServiceError(IMPORT_ERROR_CODES.GENERATION_FAILED, 502);
}

export async function generateCursorImportMapping(fullPrompt: string): Promise<string> {
  try {
    const result = await Agent.prompt(fullPrompt, {
      apiKey: getCursorApiKey(),
      model: { id: "composer-2.5" },
      name: "Statement import mapping",
      cloud: {},
    });

    return extractAssistantText(result);
  } catch (error) {
    if (error instanceof ImportServiceError) {
      throw error;
    }
    console.error("Cursor import mapping failed:", error);
    throw new ImportServiceError(IMPORT_ERROR_CODES.GENERATION_FAILED, 502);
  }
}
