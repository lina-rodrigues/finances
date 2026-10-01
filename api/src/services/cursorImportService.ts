import { Agent, type Run } from "@cursor/sdk";
import { IMPORT_ERROR_CODES, ImportServiceError } from "../constants/importErrors.js";
import { readCursorApiKey } from "./cursorAi.js";

/** Coarse phase for serverless poll loops. */
export type CursorRunPhase = "running" | "finished" | "failed";

/**
 * Map SDK/API run statuses to a poll phase.
 * Cursor may report `queued` (and similar) before `running`; treating those as
 * finished causes IMPORT_GENERATION_FAILED within seconds of upload.
 */
export function cursorRunPhase(status: string | null | undefined): CursorRunPhase {
  const normalized = (status ?? "").toLowerCase();
  if (normalized === "finished") {
    return "finished";
  }
  if (normalized === "error" || normalized === "cancelled" || normalized === "expired") {
    return "failed";
  }
  // running | queued | creating | unknown → keep waiting
  return "running";
}

function getCursorApiKey(): string {
  const apiKey = readCursorApiKey();
  if (!apiKey) {
    throw new ImportServiceError(IMPORT_ERROR_CODES.SERVICE_UNAVAILABLE, 403);
  }
  return apiKey;
}

export async function startCursorImportMapping(
  fullPrompt: string,
): Promise<{ agentId: string; runId: string }> {
  return startCursorImportAgent(fullPrompt, "Statement import mapping");
}

export async function startCursorImportKnowledgeLearn(
  fullPrompt: string,
): Promise<{ agentId: string; runId: string }> {
  return startCursorImportAgent(fullPrompt, "Import knowledge learn");
}

async function startCursorImportAgent(
  fullPrompt: string,
  name: string,
): Promise<{ agentId: string; runId: string }> {
  const apiKey = getCursorApiKey();
  let agent: Awaited<ReturnType<typeof Agent.create>> | null = null;

  try {
    agent = await Agent.create({
      apiKey,
      model: { id: "composer-2.5" },
      name,
      cloud: {},
    });

    const run = await agent.send(fullPrompt);
    return { agentId: agent.agentId, runId: run.id };
  } catch (error) {
    if (error instanceof ImportServiceError) {
      throw error;
    }
    console.error(`Cursor import start failed (${name}):`, error);
    throw new ImportServiceError(IMPORT_ERROR_CODES.GENERATION_FAILED, 502);
  } finally {
    try {
      agent?.close();
    } catch {
      // ignore close errors
    }
  }
}

export async function fetchCursorImportRun(agentId: string, runId: string): Promise<Run> {
  try {
    return await Agent.getRun(runId, {
      runtime: "cloud",
      agentId,
      apiKey: getCursorApiKey(),
    });
  } catch (error) {
    if (error instanceof ImportServiceError) {
      throw error;
    }
    console.error("Cursor import getRun failed:", error);
    throw new ImportServiceError(IMPORT_ERROR_CODES.GENERATION_FAILED, 502);
  }
}

function messageText(message: unknown): string | null {
  if (typeof message === "string" && message.trim()) {
    return message.trim();
  }
  if (!message || typeof message !== "object") {
    return null;
  }

  const record = message as Record<string, unknown>;
  if (typeof record.text === "string" && record.text.trim()) {
    return record.text.trim();
  }
  if (typeof record.content === "string" && record.content.trim()) {
    return record.content.trim();
  }
  if (Array.isArray(record.content)) {
    const parts = record.content
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object" && typeof (part as { text?: unknown }).text === "string") {
          return (part as { text: string }).text;
        }
        return "";
      })
      .filter(Boolean);
    const joined = parts.join("\n").trim();
    return joined || null;
  }

  return null;
}

export async function extractTextFromFinishedRun(run: Run, agentId: string): Promise<string> {
  const phase = cursorRunPhase(run.status);
  if (phase === "failed") {
    console.error("Cursor import run failed:", run.status, run.error);
    throw new ImportServiceError(IMPORT_ERROR_CODES.GENERATION_FAILED, 502);
  }
  if (phase !== "finished") {
    console.error("Cursor import extract called before finished:", run.status);
    throw new ImportServiceError(IMPORT_ERROR_CODES.GENERATION_FAILED, 502);
  }

  if (run.result?.trim()) {
    return run.result.trim();
  }

  try {
    const messages = await Agent.messages.list(agentId);
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const entry = messages[i];
      if (entry.type !== "assistant") {
        continue;
      }
      const text = messageText(entry.message);
      if (text) {
        return text;
      }
    }
  } catch (error) {
    console.error("Cursor import messages.list failed:", error);
  }

  console.error("Cursor import agent returned an empty response");
  throw new ImportServiceError(IMPORT_ERROR_CODES.GENERATION_FAILED, 502);
}
