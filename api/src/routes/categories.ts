import { Router } from "express";
import { z } from "zod";
import { Category } from "../models/Category.js";
import { LineItem } from "../models/LineItem.js";
import { DEFAULT_CATEGORY_ICON, isAllowedCategoryIcon } from "../constants/categoryIcons.js";
import {
  getAllCategoriesFlat,
  reorderCategories,
  toFlatCategoryResponse,
} from "../services/categoryService.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();
router.use(requireAuth);

const iconSchema = z
  .string()
  .refine(isAllowedCategoryIcon, { message: "Invalid category icon" })
  .optional();

const createCategorySchema = z.object({
  name: z.string().min(1),
  icon: iconSchema,
  order: z.number().int().optional(),
});

const updateCategorySchema = z.object({
  name: z.string().min(1).optional(),
  icon: iconSchema,
  order: z.number().int().optional(),
});

const reorderSchema = z.object({
  items: z.array(
    z.object({
      id: z.string().min(1),
      order: z.number().int(),
    }),
  ),
});

router.get(
  "/",
  asyncHandler(async (req, res) => {
    res.json(await getAllCategoriesFlat(req.userId!));
  }),
);

router.patch(
  "/reorder",
  asyncHandler(async (req, res) => {
    const body = reorderSchema.parse(req.body);
    res.json(await reorderCategories(req.userId!, body.items));
  }),
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const body = createCategorySchema.parse(req.body);

    let order = body.order;
    if (order === undefined) {
      const maxOrder = await Category.findOne({ userId: req.userId })
        .sort({ order: -1 })
        .select("order");
      order = (maxOrder?.order ?? -1) + 1;
    }

    const category = await Category.create({
      userId: req.userId,
      name: body.name,
      icon: body.icon ?? DEFAULT_CATEGORY_ICON,
      order,
    });

    res.status(201).json(toFlatCategoryResponse(category));
  }),
);

router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const body = updateCategorySchema.parse(req.body);
    const category = await Category.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { $set: body },
      { new: true, runValidators: true },
    );

    if (!category) {
      res.status(404).json({ error: "NOT_FOUND" });
      return;
    }

    res.json(toFlatCategoryResponse(category));
  }),
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const category = await Category.findOne({ _id: req.params.id, userId: req.userId });
    if (!category) {
      res.status(404).json({ error: "NOT_FOUND" });
      return;
    }

    const lineItemCount = await LineItem.countDocuments({ categoryId: req.params.id });
    if (lineItemCount > 0) {
      res.status(409).json({
        error: "CATEGORY_HAS_LINE_ITEMS",
      });
      return;
    }

    await Category.findByIdAndDelete(req.params.id);
    res.status(204).send();
  }),
);

export default router;
