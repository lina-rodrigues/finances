import { z } from "zod";
import { isValidYearMonth } from "../utils/yearMonth.js";

export const importProposedRecurrenceSchema = z
  .object({
    endType: z.enum(["never", "count", "until"]),
    occurrenceCount: z.number().int().min(1).nullable().optional(),
    startYearMonth: z
      .string()
      .refine((v) => v == null || isValidYearMonth(v), { message: "INVALID_YEAR_MONTH" })
      .nullable()
      .optional(),
    endYearMonth: z
      .string()
      .refine((v) => v == null || isValidYearMonth(v), { message: "INVALID_YEAR_MONTH" })
      .nullable()
      .optional(),
  })
  .nullable();

export const importProposedItemSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["LineItem", "LineItemEntry"]),
  label: z.string().nullable(),
  category: z.string().min(1),
  parent: z.string().nullable(),
  planned: z.number().nullable(),
  realized: z.number().nullable(),
  recurrent: z.boolean(),
  recurrence: importProposedRecurrenceSchema,
  deleted: z.boolean().default(false),
  sourceFitId: z.string().nullable(),
  notes: z.string().nullable().optional().default(null),
});

export const importProposedItemsSchema = z.array(importProposedItemSchema);

export type ImportProposedItemInput = z.infer<typeof importProposedItemSchema>;
