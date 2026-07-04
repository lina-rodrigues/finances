import { Router } from "express";
import type { Types } from "mongoose";
import { LineItem } from "../models/LineItem.js";
import { Month } from "../models/Month.js";
import { cascadeBalanceFrom } from "../services/balanceService.js";
import {
  toLineItemMutationResponse,
  updateLineItemSchema,
} from "../schemas/lineItem.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

async function cascadeForMonth(monthId: Types.ObjectId): Promise<void> {
  const month = await Month.findById(monthId);
  if (month) {
    await cascadeBalanceFrom(month.yearMonth);
  }
}

router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const body = updateLineItemSchema.parse(req.body);
    const lineItem = await LineItem.findByIdAndUpdate(
      req.params.id,
      { $set: body },
      { new: true, runValidators: true },
    );

    if (!lineItem) {
      res.status(404).json({ error: "Line item not found" });
      return;
    }

    await cascadeForMonth(lineItem.monthId);

    res.json(toLineItemMutationResponse(lineItem));
  }),
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const lineItem = await LineItem.findByIdAndDelete(req.params.id);

    if (!lineItem) {
      res.status(404).json({ error: "Line item not found" });
      return;
    }

    await cascadeForMonth(lineItem.monthId);

    res.status(204).send();
  }),
);

export default router;
