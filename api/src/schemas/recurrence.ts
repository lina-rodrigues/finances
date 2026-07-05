import { z } from "zod";
import { isValidYearMonth } from "../utils/yearMonth.js";

const yearMonthSchema = z
  .string()
  .refine(isValidYearMonth, { message: "INVALID_YEAR_MONTH" });

export const recurrenceInputSchema = z
  .object({
    startYearMonth: yearMonthSchema,
    endType: z.enum(["never", "count", "until"]),
    occurrenceCount: z.number().int().min(1).optional(),
    endYearMonth: yearMonthSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.endType === "count" && data.occurrenceCount === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "OCCURRENCE_COUNT_REQUIRED",
        path: ["occurrenceCount"],
      });
    }
    if (data.endType === "until") {
      if (!data.endYearMonth) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "END_YEAR_MONTH_REQUIRED",
          path: ["endYearMonth"],
        });
      } else if (data.endYearMonth < data.startYearMonth) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "INVALID_RECURRENCE_RANGE",
          path: ["endYearMonth"],
        });
      }
    }
  });

export type RecurrenceInput = z.infer<typeof recurrenceInputSchema>;

export const recurrenceScopeSchema = z.enum(["this", "future", "all"]);

export type RecurrenceScope = z.infer<typeof recurrenceScopeSchema>;
