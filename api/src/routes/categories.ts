import { Router } from "express";
import { z } from "zod";
import { Category } from "../models/Category.js";
import { getAllCategoriesFlat, getCategoriesTree } from "../services/categoryService.js";

const router = Router();

const createCategorySchema = z.object({
  name: z.string().min(1),
  parentId: z.string().nullable().optional(),
  order: z.number().int().optional(),
});

router.get("/", async (_req, res, next) => {
  try {
    const nested = _req.query.nested === "true";
    const data = nested ? await getCategoriesTree() : await getAllCategoriesFlat();
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const body = createCategorySchema.parse(req.body);
    const category = await Category.create({
      name: body.name,
      parentId: body.parentId ?? null,
      order: body.order ?? 0,
    });
    res.status(201).json({
      id: category._id.toString(),
      name: category.name,
      parentId: category.parentId?.toString() ?? null,
      order: category.order,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
