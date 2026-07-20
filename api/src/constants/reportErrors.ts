export const REPORT_ERROR_CODES = {
  SERVICE_UNAVAILABLE: "REPORT_SERVICE_UNAVAILABLE",
  GENERATION_FAILED: "REPORT_GENERATION_FAILED",
} as const;

export type ReportErrorCode = (typeof REPORT_ERROR_CODES)[keyof typeof REPORT_ERROR_CODES];

export class ReportServiceError extends Error {
  readonly code: ReportErrorCode;

  constructor(code: ReportErrorCode) {
    super(code);
    this.name = "ReportServiceError";
    this.code = code;
  }
}

export function toReportErrorCode(error: unknown): ReportErrorCode {
  if (error instanceof ReportServiceError) {
    return error.code;
  }
  return REPORT_ERROR_CODES.GENERATION_FAILED;
}
