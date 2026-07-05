import { Router } from "express";
import {
  cancelRecurringSeries,
  cascadeFromEarliest,
  assertSeriesOwnedByUser,
} from "../services/recurrenceService.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getCurrentYearMonth } from "../utils/yearMonth.js";

const router = Router();
router.use(requireAuth);

router.post(
  "/:id/cancel",
  asyncHandler(async (req, res) => {
    const series = await assertSeriesOwnedByUser(req.params.id, req.userId!);
    if (!series) {
      res.status(404).json({ error: "NOT_FOUND" });
      return;
    }

    if (series.cancelledAt) {
      res.status(409).json({ error: "SERIES_ALREADY_CANCELLED" });
      return;
    }

    const fromYearMonth =
      typeof req.body?.fromYearMonth === "string"
        ? req.body.fromYearMonth
        : getCurrentYearMonth();

    const cascadeFrom = await cancelRecurringSeries(req.userId!, series, fromYearMonth);
    await cascadeFromEarliest(req.userId!, cascadeFrom);

    res.json({
      id: series._id.toString(),
      cancelledAt: series.cancelledAt,
    });
  }),
);

export default router;
