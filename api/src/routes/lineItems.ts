import { Router } from "express";
import { z } from "zod";
import mongoose from "mongoose";
import { LineItem } from "../models/LineItem.js";
import { Month } from "../models/Month.js";
import { cascadeBalanceFrom } from "../services/balanceService.js";

const router = Router();

const updateLineItemSchema = z.object({
  categoryId: z.string().min(1).optional(),
  type: z.enum(["income", "expense"]).optional(),
  label: z.string().min(1).optional(),
  plannedAmount: z.number().optional(),
  realizedAmount: z.number().nullable().optional(),
});

router.patch("/:id", async (req, res, next) => {
  try {
    const body = updateLineItemSchema.parse(req.body);
    const lineItem = await LineItem.findById(req.params.id);

    if (!lineItem) {
      res.status(404).json({ error: "Line item not found" });
      return;
    }

    if (body.categoryId !== undefined) {
      lineItem.categoryId = new mongoose.Types.ObjectId(body.categoryId);
    }
    if (body.type !== undefined) lineItem.type = body.type;
    if (body.label !== undefined) lineItem.label = body.label;
    if (body.plannedAmount !== undefined) lineItem.plannedAmount = body.plannedAmount;
    if (body.realizedAmount !== undefined) lineItem.realizedAmount = body.realizedAmount;

    await lineItem.save();

    const month = await Month.findById(lineItem.monthId);
    if (month) {
      await cascadeBalanceFrom(month.yearMonth);
    }

    res.json({
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

router.delete("/:id", async (req, res, next) => {
  try {
    const lineItem = await LineItem.findById(req.params.id);

    if (!lineItem) {
      res.status(404).json({ error: "Line item not found" });
      return;
    }

    const month = await Month.findById(lineItem.monthId);
    await lineItem.deleteOne();

    if (month) {
      await cascadeBalanceFrom(month.yearMonth);
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
