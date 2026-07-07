import { Router } from "express";
import { LineItem } from "../models/LineItem.js";
import { Month } from "../models/Month.js";
import { RecurringSeries } from "../models/RecurringSeries.js";
import {
  cascadeBalanceFrom,
  computeBalance,
  computeRealizedBalance,
  ensureMonth,
} from "../services/balanceService.js";
import { getCategoriesWithLineItems } from "../services/categoryService.js";
import { assertCategoryOwnedByUser } from "../services/ownershipService.js";
import {
  createRecurringSeries,
  cascadeFromEarliest,
  extendSeriesForMonthView,
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
  previousYearMonth,
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
  const extendFrom = await extendSeriesForMonthView(userId, yearMonth);
  if (extendFrom) {
    await cascadeFromEarliest(userId, extendFrom);
  }

  const month = await ensureMonth(userId, yearMonth);
  const lineItems = await LineItem.find({ monthId: month._id }).sort({ createdAt: 1 });

  const seriesIds = [
    ...new Set(
      lineItems
        .filter((item) => item.seriesId)
        .map((item) => item.seriesId!.toString()),
    ),
  ];

  const seriesList =
    seriesIds.length > 0
      ? await RecurringSeries.find({ _id: { $in: seriesIds }, userId })
      : [];

  const seriesById = new Map(seriesList.map((series) => [series._id.toString(), series]));

  const { categories, uncategorized } = await getCategoriesWithLineItems(
    userId,
    lineItems,
    seriesById,
  );

  const expectedBalance = computeBalance(month.lastMonthBalance, lineItems);
  const currentRealizedBalance = computeRealizedBalance(month.lastMonthBalance, lineItems);

  let lastMonthRealizedBalance = 0;
  const prevYearMonth = previousYearMonth(yearMonth);
  const prevMonth = await Month.findOne({ userId, yearMonth: prevYearMonth });
  if (prevMonth) {
    const prevLineItems = await LineItem.find({ monthId: prevMonth._id });
    lastMonthRealizedBalance = computeRealizedBalance(prevMonth.lastMonthBalance, prevLineItems);
  }

  return {
    month: {
      id: month._id.toString(),
      yearMonth: month.yearMonth,
      lastMonthBalance: month.lastMonthBalance,
      endingBalance: expectedBalance,
      lastMonthRealizedBalance,
      expectedBalance,
      currentRealizedBalance,
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
      realizedAmount: body.realizedAmount ?? null,
    });

    await cascadeBalanceFrom(req.userId!, yearMonth);

    res.status(201).json(toLineItemMutationResponse(lineItem));
  }),
);

export default router;
