import { Router } from "express";
import type { Types } from "mongoose";
import { LineItem } from "../models/LineItem.js";
import { Month } from "../models/Month.js";
import { cascadeBalanceFrom } from "../services/balanceService.js";
import { assertLineItemOwnedByUser, assertCategoryOwnedByUser } from "../services/ownershipService.js";
import {
  toLineItemMutationResponse,
  updateLineItemSchema,
} from "../schemas/lineItem.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();
router.use(requireAuth);

async function cascadeForMonth(userId: string, monthId: Types.ObjectId): Promise<void> {
  const month = await Month.findOne({ _id: monthId, userId });
  if (month) {
    await cascadeBalanceFrom(userId, month.yearMonth);
  }
}

router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const owned = await assertLineItemOwnedByUser(req.params.id, req.userId!);
    if (!owned) {
      res.status(404).json({ error: "NOT_FOUND" });
      return;
    }

    const body = updateLineItemSchema.parse(req.body);

    if (body.categoryId) {
      const categoryOwned = await assertCategoryOwnedByUser(body.categoryId, req.userId!);
      if (!categoryOwned) {
        res.status(404).json({ error: "NOT_FOUND" });
        return;
      }
    }

    const lineItem = await LineItem.findByIdAndUpdate(
      req.params.id,
      { $set: body },
      { new: true, runValidators: true },
    );

    if (!lineItem) {
      res.status(404).json({ error: "NOT_FOUND" });
      return;
    }

    await cascadeForMonth(req.userId!, lineItem.monthId);

    res.json(toLineItemMutationResponse(lineItem));
  }),
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const owned = await assertLineItemOwnedByUser(req.params.id, req.userId!);
    if (!owned) {
      res.status(404).json({ error: "NOT_FOUND" });
      return;
    }

    const lineItem = await LineItem.findByIdAndDelete(req.params.id);

    if (!lineItem) {
      res.status(404).json({ error: "NOT_FOUND" });
      return;
    }

    await cascadeForMonth(req.userId!, lineItem.monthId);

    res.status(204).send();
  }),
);

export default router;
