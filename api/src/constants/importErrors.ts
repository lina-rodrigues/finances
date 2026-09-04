export const IMPORT_ERROR_CODES = {
  SERVICE_UNAVAILABLE: "IMPORT_SERVICE_UNAVAILABLE",
  GENERATION_FAILED: "IMPORT_GENERATION_FAILED",
  INVALID_OFX: "IMPORT_INVALID_OFX",
  MISSING_FITID: "IMPORT_MISSING_FITID",
  NOT_FOUND: "IMPORT_NOT_FOUND",
  INVALID_STATUS: "IMPORT_INVALID_STATUS",
  MUST_UNDO_FIRST: "IMPORT_MUST_UNDO_FIRST",
  APPLY_FAILED: "IMPORT_APPLY_FAILED",
  FILE_TOO_LARGE: "IMPORT_FILE_TOO_LARGE",
} as const;

export type ImportErrorCode = (typeof IMPORT_ERROR_CODES)[keyof typeof IMPORT_ERROR_CODES];

export class ImportServiceError extends Error {
  readonly code: ImportErrorCode;
  readonly status: number;

  constructor(code: ImportErrorCode, status = 400) {
    super(code);
    this.name = "ImportServiceError";
    this.code = code;
    this.status = status;
  }
}

export function toImportErrorCode(error: unknown): ImportErrorCode {
  if (error instanceof ImportServiceError) {
    return error.code;
  }
  return IMPORT_ERROR_CODES.GENERATION_FAILED;
}
