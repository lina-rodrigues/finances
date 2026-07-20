import { Router } from "express";
import { LineItem, applyRealizedAmountWrite } from "../models/LineItem.js";
import {
  cascadeBalanceFrom,
  ensureMonth,
} from "../services/balanceService.js";
import { assertCategoryOwnedByUser } from "../services/ownershipService.js";
import { buildMonthView } from "../services/monthViewService.js";
import {
  createRecurringSeries,
  cascadeFromEarliest,
} from "../services/recurrenceService.js";
import {
  createLineItemSchema,
  toLineItemMutationResponse,
} from "../schemas/lineItem.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  getCurrentYearMonth,
  isValidYearMonth,
} from "../utils/yearMonth.js";

const router = Router();
router.use(requireAuth);

router.param("yearMonth", (req, res, next, value) => {
  if (!isValidYearMonth(value)) {
    res.status(400).json({ error: "INVALID_YEAR_MONTH" });
    return;
  }
  next();
});

router.get(
  "/current",
  asyncHandler(async (req, res) => {
    res.json(await buildMonthView(req.userId!, getCurrentYearMonth()));
  }),
);

router.get(
  "/:yearMonth",
  asyncHandler(async (req, res) => {
    res.json(await buildMonthView(req.userId!, req.params.yearMonth));
  }),
);

router.post(
  "/:yearMonth/line-items",
  asyncHandler(async (req, res) => {
    const body = createLineItemSchema.parse(req.body);

    if (body.categoryId) {
      const owned = await assertCategoryOwnedByUser(body.categoryId, req.userId!);
      if (!owned) {
        res.status(404).json({ error: "NOT_FOUND" });
        return;
      }
    }

    if (body.recurrence) {
      const { firstItem, cascadeFrom } = await createRecurringSeries(req.userId!, {
        categoryId: body.categoryId ?? null,
        type: body.type,
        label: body.label,
        plannedAmount: body.plannedAmount,
        realizedAmount: body.realizedAmount ?? null,
        recurrence: body.recurrence,
      });

      await cascadeFromEarliest(req.userId!, cascadeFrom);

      res.status(201).json(toLineItemMutationResponse(firstItem));
      return;
    }

    const { yearMonth } = req.params;
    const month = await ensureMonth(req.userId!, yearMonth);

    const lineItem = await LineItem.create({
      monthId: month._id,
      categoryId: body.categoryId ?? null,
      type: body.type,
      label: body.label,
      plannedAmount: body.plannedAmount,
      entries: [],
    });

    if (body.realizedAmount != null) {
      applyRealizedAmountWrite(lineItem, body.realizedAmount);
      await lineItem.save();
    }

    await cascadeBalanceFrom(req.userId!, yearMonth);

    res.status(201).json(toLineItemMutationResponse(lineItem));
  }),
);

export default router;
