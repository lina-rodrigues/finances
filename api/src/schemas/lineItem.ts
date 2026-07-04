import { z } from "zod";
import type { ILineItem } from "../models/LineItem.js";

const lineItemFields = z.object({
  categoryId: z.string().min(1).nullable().optional(),
  type: z.enum(["income", "expense"]),
  label: z.string().min(1),
  plannedAmount: z.number(),
  realizedAmount: z.number().nullable().optional(),
});

export const createLineItemSchema = lineItemFields;
export const updateLineItemSchema = lineItemFields.partial();

export function toLineItemMutationResponse(item: ILineItem) {
  return {
    id: item._id.toString(),
    type: item.type,
    label: item.label,
    plannedAmount: item.plannedAmount,
    realizedAmount: item.realizedAmount,
  };
}
