import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { updateUserSchema } from "../schemas/auth.js";
import { updateUserProfile, toPublicUser, AuthError } from "../services/authService.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.patch(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    try {
      const body = updateUserSchema.parse(req.body);
      const user = await updateUserProfile(req.userId!, {
        name: body.name,
        preferences: body.preferences,
      });
      res.json(toPublicUser(user));
    } catch (err) {
      if (err instanceof AuthError) {
        res.status(err.status).json({ error: err.code });
        return;
      }
      throw err;
    }
  }),
);

export default router;
