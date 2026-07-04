import { Router } from "express";
import {
  loginUser,
  registerUser,
  requestPasswordReset,
  resetPassword,
  toPublicUser,
  signToken,
  AuthError,
} from "../services/authService.js";
import { resolveCountry, resolveSignupPreferences } from "../utils/resolveCountry.js";
import { setAuthCookie, clearAuthCookie } from "../utils/authCookie.js";
import { requireAuth } from "../middleware/requireAuth.js";
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "../schemas/auth.js";
import { User } from "../models/User.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.post(
  "/register",
  asyncHandler(async (req, res) => {
    try {
      const body = registerSchema.parse(req.body);
      const country = resolveCountry(req, body.localeHints);
      const { language, currency } = resolveSignupPreferences(country);

      const user = await registerUser({
        name: body.name,
        email: body.email,
        password: body.password,
        invitationCode: body.invitationCode,
        language,
        currency,
      });

      const token = signToken(user._id);
      setAuthCookie(res, token);
      res.status(201).json(toPublicUser(user));
    } catch (err) {
      if (err instanceof AuthError) {
        res.status(err.status).json({ error: err.code });
        return;
      }
      throw err;
    }
  }),
);

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    try {
      const body = loginSchema.parse(req.body);
      const user = await loginUser(body.email, body.password);
      const token = signToken(user._id);
      setAuthCookie(res, token);
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

router.post(
  "/logout",
  requireAuth,
  asyncHandler(async (_req, res) => {
    clearAuthCookie(res);
    res.status(204).send();
  }),
);

router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.userId);
    if (!user) {
      res.status(401).json({ error: "UNAUTHORIZED" });
      return;
    }
    res.json(toPublicUser(user));
  }),
);

router.post(
  "/forgot-password",
  asyncHandler(async (req, res) => {
    const body = forgotPasswordSchema.parse(req.body);
    await requestPasswordReset(body.email);
    res.json({ ok: true });
  }),
);

router.post(
  "/reset-password",
  asyncHandler(async (req, res) => {
    try {
      const body = resetPasswordSchema.parse(req.body);
      await resetPassword(body.token, body.password);
      res.json({ ok: true });
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
