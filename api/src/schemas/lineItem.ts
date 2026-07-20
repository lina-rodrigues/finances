import { z } from "zod";
import type { ILineItem, ILineItemEntry } from "../models/LineItem.js";
import { getRealizedAmount } from "../models/LineItem.js";
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

export const addLineItemEntrySchema = z.object({
  amount: z.number().finite().refine((value) => value !== 0, {
    message: "Amount must not be zero",
  }),
  note: z.string().trim().min(1).optional(),
});

function toEntryResponse(entry: ILineItemEntry) {
  return {
    id: entry._id.toString(),
    amount: entry.amount,
    note: entry.note,
    createdAt: entry.createdAt.toISOString(),
  };
}

export function toLineItemMutationResponse(item: ILineItem) {
  const entries = item.entries ?? [];
  const realizedAmount = getRealizedAmount(item);
  return {
    id: item._id.toString(),
    type: item.type,
    label: item.label,
    plannedAmount: item.plannedAmount,
    realizedAmount,
    entries: entries.map(toEntryResponse),
    entryCount: entries.length,
    seriesId: item.seriesId?.toString() ?? null,
    seriesOccurrenceIndex: item.seriesOccurrenceIndex,
    isSeriesException: item.seriesException,
  };
}

export function toLineItemEntryMutationResponse(item: ILineItem, entry: ILineItemEntry) {
  return {
    entry: toEntryResponse(entry),
    lineItem: toLineItemMutationResponse(item),
  };
}
