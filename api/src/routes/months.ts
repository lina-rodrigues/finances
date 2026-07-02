import { Router } from "express";
import { z } from "zod";
import { Month } from "../models/Month.js";
import { LineItem } from "../models/LineItem.js";
import {
  cascadeBalanceFrom,
  computeEndingBalance,
  ensureMonth,
} from "../services/balanceService.js";
import { getCategoriesWithLineItems } from "../services/categoryService.js";
import {
  getCurrentYearMonth,
  isValidYearMonth,
} from "../utils/yearMonth.js";

const router = Router();

async function buildMonthView(yearMonth: string) {
  const month = await ensureMonth(yearMonth);
  const endingBalance = await computeEndingBalance(month._id.toString());
  const categories = await getCategoriesWithLineItems(month._id);

  return {
    month: {
      id: month._id.toString(),
      yearMonth: month.yearMonth,
      lastMonthBalance: month.lastMonthBalance,
      endingBalance,
    },
    categories,
  };
}

router.get("/current", async (_req, res, next) => {
  try {
    const yearMonth = getCurrentYearMonth();
    const data = await buildMonthView(yearMonth);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get("/:yearMonth", async (req, res, next) => {
  try {
    const { yearMonth } = req.params;
    if (!isValidYearMonth(yearMonth)) {
      res.status(400).json({ error: "Invalid yearMonth format. Use YYYY-MM." });
      return;
    }
    const data = await buildMonthView(yearMonth);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

const createLineItemSchema = z.object({
  categoryId: z.string().min(1),
  type: z.enum(["income", "expense"]),
  label: z.string().min(1),
  plannedAmount: z.number(),
  realizedAmount: z.number().nullable().optional(),
});

router.post("/:yearMonth/line-items", async (req, res, next) => {
  try {
    const { yearMonth } = req.params;
    if (!isValidYearMonth(yearMonth)) {
      res.status(400).json({ error: "Invalid yearMonth format. Use YYYY-MM." });
      return;
    }

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

    res.status(201).json({
      id: lineItem._id.toString(),
      type: lineItem.type,
      label: lineItem.label,
      plannedAmount: lineItem.plannedAmount,
      realizedAmount: lineItem.realizedAmount,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
