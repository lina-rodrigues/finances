import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const apiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const defaultPromptPath = path.join(apiRoot, "prompts", "statement-import.txt");

export async function loadStatementImportPrompt(): Promise<string> {
  const configured = process.env.AI_IMPORT_PROMPT_PATH;
  const promptPath = configured
    ? path.isAbsolute(configured)
      ? configured
      : path.join(apiRoot, configured)
    : defaultPromptPath;
  const contents = await readFile(promptPath, "utf8");
  const trimmed = contents.trim();
  if (!trimmed) {
    throw new Error(`Import prompt file is empty: ${promptPath}`);
  }
  return trimmed;
}
