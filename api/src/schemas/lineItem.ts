import { z } from "zod";
import type { ILineItem } from "../models/LineItem.js";
import { recurrenceInputSchema, recurrenceScopeSchema } from "./recurrence.js";

const lineItemFields = z.object({
  categoryId: z.string().min(1).nullable().optional(),
  type: z.enum(["income", "expense"]),
  label: z.string().min(1),
  plannedAmount: z.number(),
  realizedAmount: z.number().nullable().optional(),
});

export const createLineItemSchema = lineItemFields.extend({
  recurrence: recurrenceInputSchema.optional(),
});

export const updateLineItemSchema = lineItemFields.partial().extend({
  scope: recurrenceScopeSchema.optional(),
});

export const convertToRecurrenceSchema = recurrenceInputSchema;

export const deleteLineItemSchema = z.object({
  scope: recurrenceScopeSchema.optional(),
});

export function toLineItemMutationResponse(item: ILineItem) {
  return {
    id: item._id.toString(),
    type: item.type,
    label: item.label,
    plannedAmount: item.plannedAmount,
    realizedAmount: item.realizedAmount,
    seriesId: item.seriesId?.toString() ?? null,
    seriesOccurrenceIndex: item.seriesOccurrenceIndex,
    isSeriesException: item.seriesException,
  };
}
