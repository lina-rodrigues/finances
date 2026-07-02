import { Router } from "express";
import { z } from "zod";
import { Category } from "../models/Category.js";
import { LineItem } from "../models/LineItem.js";
import {
  ALLOWED_CATEGORY_ICONS,
  DEFAULT_CATEGORY_ICON,
  isAllowedCategoryIcon,
} from "../constants/categoryIcons.js";
import {
  getAllCategoriesFlat,
  reorderCategories,
} from "../services/categoryService.js";

const router = Router();

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

router.get("/", async (_req, res, next) => {
  try {
    const data = await getAllCategoriesFlat();
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.patch("/reorder", async (req, res, next) => {
  try {
    const body = reorderSchema.parse(req.body);
    const data = await reorderCategories(body.items);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const body = createCategorySchema.parse(req.body);

    let order = body.order;
    if (order === undefined) {
      const maxOrder = await Category.findOne().sort({ order: -1 }).select("order");
      order = (maxOrder?.order ?? -1) + 1;
    }

    const category = await Category.create({
      name: body.name,
      icon: body.icon ?? DEFAULT_CATEGORY_ICON,
      order,
    });

    res.status(201).json({
      id: category._id.toString(),
      name: category.name,
      order: category.order,
      icon: category.icon,
    });
  } catch (err) {
    next(err);
  }
});

router.patch("/:id", async (req, res, next) => {
  try {
    const body = updateCategorySchema.parse(req.body);
    const category = await Category.findByIdAndUpdate(
      req.params.id,
      { $set: body },
      { new: true, runValidators: true },
    );

    if (!category) {
      res.status(404).json({ error: "Category not found" });
      return;
    }

    res.json({
      id: category._id.toString(),
      name: category.name,
      order: category.order,
      icon: category.icon,
    });
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const lineItemCount = await LineItem.countDocuments({ categoryId: req.params.id });
    if (lineItemCount > 0) {
      res.status(409).json({
        error: "Cannot delete category with existing line items",
      });
      return;
    }

    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) {
      res.status(404).json({ error: "Category not found" });
      return;
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export { ALLOWED_CATEGORY_ICONS };

export default router;
