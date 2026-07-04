import { Router } from "express";
import { LineItem } from "../models/LineItem.js";
import {
  cascadeBalanceFrom,
  computeBalance,
  ensureMonth,
} from "../services/balanceService.js";
import { getCategoriesWithLineItems } from "../services/categoryService.js";
import {
  createLineItemSchema,
  toLineItemMutationResponse,
} from "../schemas/lineItem.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  getCurrentYearMonth,
  isValidYearMonth,
} from "../utils/yearMonth.js";

const router = Router();

router.param("yearMonth", (req, res, next, value) => {
  if (!isValidYearMonth(value)) {
    res.status(400).json({ error: "Invalid yearMonth format. Use YYYY-MM." });
    return;
  }
  next();
});

async function buildMonthView(yearMonth: string) {
  const month = await ensureMonth(yearMonth);
  const lineItems = await LineItem.find({ monthId: month._id }).sort({ createdAt: 1 });

  return {
    month: {
      id: month._id.toString(),
      yearMonth: month.yearMonth,
      lastMonthBalance: month.lastMonthBalance,
      endingBalance: computeBalance(month.lastMonthBalance, lineItems),
    },
    categories: await getCategoriesWithLineItems(lineItems),
  };
}

router.get(
  "/current",
  asyncHandler(async (_req, res) => {
    res.json(await buildMonthView(getCurrentYearMonth()));
  }),
);

router.get(
  "/:yearMonth",
  asyncHandler(async (req, res) => {
    res.json(await buildMonthView(req.params.yearMonth));
  }),
);

router.post(
  "/:yearMonth/line-items",
  asyncHandler(async (req, res) => {
    const { yearMonth } = req.params;
    const body = createLineItemSchema.parse(req.body);
    const month = await ensureMonth(yearMonth);

    const lineItem = await LineItem.create({
      monthId: month._id,
      categoryId: body.categoryId,
      type: body.type,
      label: body.label,
      plannedAmount: body.plannedAmount,
      realizedAmount: body.realizedAmount ?? null,
    });

    await cascadeBalanceFrom(yearMonth);

    res.status(201).json(toLineItemMutationResponse(lineItem));
  }),
);

export default router;
