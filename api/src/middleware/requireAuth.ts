import type { RequestHandler } from "express";
import { verifyToken, AuthError } from "../services/authService.js";
import { AUTH_COOKIE_NAME } from "../utils/authCookie.js";

export const requireAuth: RequestHandler = (req, res, next) => {
  const token = req.cookies?.[AUTH_COOKIE_NAME] as string | undefined;

  if (!token) {
    res.status(401).json({ error: "UNAUTHORIZED" });
    return;
  }

  try {
    const { userId } = verifyToken(token);
    req.userId = userId;
    next();
  } catch {
    res.status(401).json({ error: "UNAUTHORIZED" });
  }
};

export function handleAuthError(err: unknown): { status: number; error: string } | null {
  if (err instanceof AuthError) {
    return { status: err.status, error: err.code };
  }
  return null;
}
