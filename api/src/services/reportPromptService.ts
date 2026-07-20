import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const apiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const defaultPromptPath = path.join(apiRoot, "prompts", "financial-health-report.txt");

function resolvePromptPath(): string {
  const configured = process.env.AI_REPORT_PROMPT_PATH;
  if (!configured) {
    return defaultPromptPath;
  }
  return path.isAbsolute(configured) ? configured : path.join(apiRoot, configured);
}

export async function loadReportPrompt(): Promise<string> {
  const promptPath = resolvePromptPath();
  const contents = await readFile(promptPath, "utf8");
  const trimmed = contents.trim();
  if (!trimmed) {
    throw new Error(`Report prompt file is empty: ${promptPath}`);
  }
  return trimmed;
}
