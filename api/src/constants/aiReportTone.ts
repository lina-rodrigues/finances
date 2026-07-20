export const AI_REPORT_TONES = ["normal", "formal", "technical", "informal"] as const;

export type AiReportTone = (typeof AI_REPORT_TONES)[number];

export const DEFAULT_AI_REPORT_TONE: AiReportTone = "normal";

/** Map legacy stored values and unknown strings to a supported tone. */
export function normalizeAiReportTone(value: string | null | undefined): AiReportTone {
  if (value === "formal" || value === "technical" || value === "informal") {
    return value;
  }
  // `normal` (current), legacy `friendly`, and legacy `normal` all use the Normal voice.
  return "normal";
}

export function isAiReportTone(value: string): value is AiReportTone {
  return (AI_REPORT_TONES as readonly string[]).includes(value);
}
