import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const apiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const defaultPromptPath = path.join(apiRoot, "prompts", "statement-import.txt");
const defaultKnowledgePromptPath = path.join(apiRoot, "prompts", "import-knowledge-learn.txt");

async function loadPromptFile(promptPath: string, label: string): Promise<string> {
  const contents = await readFile(promptPath, "utf8");
  const trimmed = contents.trim();
  if (!trimmed) {
    throw new Error(`${label} prompt file is empty: ${promptPath}`);
  }
  return trimmed;
}

export async function loadStatementImportPrompt(): Promise<string> {
  const configured = process.env.AI_IMPORT_PROMPT_PATH;
  const promptPath = configured
    ? path.isAbsolute(configured)
      ? configured
      : path.join(apiRoot, configured)
    : defaultPromptPath;
  return loadPromptFile(promptPath, "Import");
}

export async function loadImportKnowledgeLearnPrompt(): Promise<string> {
  const configured = process.env.AI_IMPORT_KNOWLEDGE_PROMPT_PATH;
  const promptPath = configured
    ? path.isAbsolute(configured)
      ? configured
      : path.join(apiRoot, configured)
    : defaultKnowledgePromptPath;
  return loadPromptFile(promptPath, "Import knowledge");
}
