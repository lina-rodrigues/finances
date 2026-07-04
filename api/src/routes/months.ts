import { Router } from "express";
import { LineItem } from "../models/LineItem.js";
import {
  cascadeBalanceFrom,
  computeBalance,
  ensureMonth,
} from "../services/balanceService.js";
import { getCategoriesWithLineItems } from "../services/categoryService.js";
import { assertCategoryOwnedByUser } from "../services/ownershipService.js";
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

async function buildMonthView(userId: string, yearMonth: string) {
  const month = await ensureMonth(userId, yearMonth);
  const lineItems = await LineItem.find({ monthId: month._id }).sort({ createdAt: 1 });

  const { categories, uncategorized } = await getCategoriesWithLineItems(userId, lineItems);

  return {
    month: {
      id: month._id.toString(),
      yearMonth: month.yearMonth,
      lastMonthBalance: month.lastMonthBalance,
      endingBalance: computeBalance(month.lastMonthBalance, lineItems),
    },
    categories,
    uncategorized,
  };
}

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
    const { yearMonth } = req.params;
    const body = createLineItemSchema.parse(req.body);
    const month = await ensureMonth(req.userId!, yearMonth);

    if (body.categoryId) {
      const owned = await assertCategoryOwnedByUser(body.categoryId, req.userId!);
      if (!owned) {
        res.status(404).json({ error: "NOT_FOUND" });
        return;
      }
    }

    const lineItem = await LineItem.create({
      monthId: month._id,
      categoryId: body.categoryId ?? null,
      type: body.type,
      label: body.label,
      plannedAmount: body.plannedAmount,
      realizedAmount: body.realizedAmount ?? null,
    });

    await cascadeBalanceFrom(req.userId!, yearMonth);

    res.status(201).json(toLineItemMutationResponse(lineItem));
  }),
);

export default router;
