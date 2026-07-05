import { Router } from "express";
import type { Types } from "mongoose";
import { LineItem } from "../models/LineItem.js";
import { Month } from "../models/Month.js";
import { RecurringSeries } from "../models/RecurringSeries.js";
import { cascadeBalanceFrom } from "../services/balanceService.js";
import {
  applyRecurringLineItemDelete,
  applyRecurringLineItemEdit,
  assertSeriesOwnedByUser,
  cascadeFromEarliest,
  convertLineItemToSeries,
} from "../services/recurrenceService.js";
import { assertLineItemOwnedByUser, assertCategoryOwnedByUser } from "../services/ownershipService.js";
import {
  convertToRecurrenceSchema,
  deleteLineItemSchema,
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

router.post(
  "/:id/recurrence",
  asyncHandler(async (req, res) => {
    const owned = await assertLineItemOwnedByUser(req.params.id, req.userId!);
    if (!owned) {
      res.status(404).json({ error: "NOT_FOUND" });
      return;
    }

    const lineItem = await LineItem.findById(req.params.id);
    if (!lineItem) {
      res.status(404).json({ error: "NOT_FOUND" });
      return;
    }

    if (lineItem.seriesId) {
      res.status(409).json({ error: "ALREADY_RECURRING" });
      return;
    }

    const recurrence = convertToRecurrenceSchema.parse(req.body);

    try {
      const { series, cascadeFrom } = await convertLineItemToSeries(
        req.userId!,
        lineItem,
        recurrence,
      );
      await cascadeFromEarliest(req.userId!, cascadeFrom);

      const updatedItem = await LineItem.findOne({
        seriesId: series._id,
        seriesOccurrenceIndex: 1,
      });

      if (!updatedItem) {
        res.status(500).json({ error: "SERIES_GENERATION_FAILED" });
        return;
      }

      res.status(201).json(toLineItemMutationResponse(updatedItem));
    } catch (err) {
      if (err instanceof Error && err.message === "START_MONTH_MISMATCH") {
        res.status(400).json({ error: "START_MONTH_MISMATCH" });
        return;
      }
      throw err;
    }
  }),
);

router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const owned = await assertLineItemOwnedByUser(req.params.id, req.userId!);
    if (!owned) {
      res.status(404).json({ error: "NOT_FOUND" });
      return;
    }

    const body = updateLineItemSchema.parse(req.body);
    const { scope, ...patch } = body;

    if (patch.categoryId) {
      const categoryOwned = await assertCategoryOwnedByUser(patch.categoryId, req.userId!);
      if (!categoryOwned) {
        res.status(404).json({ error: "NOT_FOUND" });
        return;
      }
    }

    const lineItem = await LineItem.findById(req.params.id);
    if (!lineItem) {
      res.status(404).json({ error: "NOT_FOUND" });
      return;
    }

    if (lineItem.seriesId) {
      if (!scope) {
        res.status(400).json({ error: "RECURRENCE_SCOPE_REQUIRED" });
        return;
      }

      const series = await assertSeriesOwnedByUser(lineItem.seriesId.toString(), req.userId!);
      if (!series) {
        res.status(404).json({ error: "NOT_FOUND" });
        return;
      }

      const cascadeFrom = await applyRecurringLineItemEdit(
        req.userId!,
        lineItem,
        series,
        scope,
        patch,
      );

      await cascadeFromEarliest(req.userId!, cascadeFrom);

      const updated = await LineItem.findById(req.params.id);
      if (!updated && scope !== "future" && scope !== "all") {
        res.status(404).json({ error: "NOT_FOUND" });
        return;
      }

      const responseItem =
        updated ??
        (await LineItem.findOne({ seriesId: series._id, seriesOccurrenceIndex: 1 }));

      if (!responseItem) {
        res.status(404).json({ error: "NOT_FOUND" });
        return;
      }

      res.json(toLineItemMutationResponse(responseItem));
      return;
    }

    const updatedItem = await LineItem.findByIdAndUpdate(
      req.params.id,
      { $set: patch },
      { new: true, runValidators: true },
    );

    if (!updatedItem) {
      res.status(404).json({ error: "NOT_FOUND" });
      return;
    }

    await cascadeForMonth(req.userId!, updatedItem.monthId);

    res.json(toLineItemMutationResponse(updatedItem));
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

    const body =
      req.body && Object.keys(req.body).length > 0
        ? deleteLineItemSchema.parse(req.body)
        : { scope: undefined };

    const lineItem = await LineItem.findById(req.params.id);
    if (!lineItem) {
      res.status(404).json({ error: "NOT_FOUND" });
      return;
    }

    if (lineItem.seriesId) {
      if (!body.scope) {
        res.status(400).json({ error: "RECURRENCE_SCOPE_REQUIRED" });
        return;
      }

      const series = await assertSeriesOwnedByUser(lineItem.seriesId.toString(), req.userId!);
      if (!series) {
        res.status(404).json({ error: "NOT_FOUND" });
        return;
      }

      const cascadeFrom = await applyRecurringLineItemDelete(
        req.userId!,
        lineItem,
        series,
        body.scope,
      );

      await cascadeFromEarliest(req.userId!, cascadeFrom);
      res.status(204).send();
      return;
    }

    await LineItem.findByIdAndDelete(req.params.id);
    await cascadeForMonth(req.userId!, lineItem.monthId);
    res.status(204).send();
  }),
);

export default router;
