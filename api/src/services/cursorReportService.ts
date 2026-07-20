import path from "node:path";
import { fileURLToPath } from "node:url";
import { Agent, type RunResult } from "@cursor/sdk";

const apiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function getCursorApiKey(): string {
  const apiKey = process.env.CURSOR_API_KEY;
  if (!apiKey) {
    throw new Error("CURSOR_API_KEY is not configured");
  }
  return apiKey;
}

function extractAssistantText(result: RunResult): string {
  if (result.status === "error") {
    throw new Error(result.error?.message ?? "Cursor agent failed");
  }

  if (result.result?.trim()) {
    return result.result.trim();
  }

  throw new Error("Cursor agent returned an empty response");
}

export async function generateCursorReport(fullPrompt: string): Promise<string> {
  const result = await Agent.prompt(fullPrompt, {
    apiKey: getCursorApiKey(),
    model: { id: "composer-2.5" },
    local: { cwd: apiRoot },
  });

  return extractAssistantText(result);
}
