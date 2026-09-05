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

export type ImportApplyFailureReason =
  | "CATEGORY_NOT_FOUND"
  | "MISSING_PARENT"
  | "MISSING_REALIZED"
  | "PARENT_NOT_FOUND"
  | "MISSING_LABEL"
  | "MISSING_PLANNED"
  | "RECURRENCE_COUNT_MISSING"
  | "RECURRENCE_UNTIL_MISSING"
  | "UNEXPECTED";

export interface ImportApplyErrorDetails {
  reason: ImportApplyFailureReason;
  itemId: string | null;
  itemIndex: number | null;
  sourceFitId: string | null;
  type: "LineItem" | "LineItemEntry" | null;
  category: string | null;
  label: string | null;
  parent: string | null;
  planned: number | null;
  realized: number | null;
  message?: string;
}

export class ImportServiceError extends Error {
  readonly code: ImportErrorCode;
  readonly status: number;
  readonly details: ImportApplyErrorDetails | null;

  constructor(
    code: ImportErrorCode,
    status = 400,
    details: ImportApplyErrorDetails | null = null,
  ) {
    super(code);
    this.name = "ImportServiceError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export function toImportErrorCode(error: unknown): ImportErrorCode {
  if (error instanceof ImportServiceError) {
    return error.code;
  }
  return IMPORT_ERROR_CODES.GENERATION_FAILED;
}

export function applyFailure(
  reason: ImportApplyFailureReason,
  item: {
    id: string;
    type: "LineItem" | "LineItemEntry";
    category: string;
    label: string | null;
    parent: string | null;
    planned: number | null;
    realized: number | null;
    sourceFitId: string | null;
  },
  itemIndex: number | null = null,
  message?: string,
): ImportServiceError {
  return new ImportServiceError(IMPORT_ERROR_CODES.APPLY_FAILED, 400, {
    reason,
    itemId: item.id,
    itemIndex,
    sourceFitId: item.sourceFitId,
    type: item.type,
    category: item.category,
    label: item.label,
    parent: item.parent,
    planned: item.planned,
    realized: item.realized,
    ...(message ? { message } : {}),
  });
}
