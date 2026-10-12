import type { RequestHandler } from "express";
import { User } from "../models/User.js";

/** Resolve whose finances this login can see, without changing settings identity. */
export const loadViewer: RequestHandler = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId).select("readOnly parentUserId");
    if (!user) {
      res.status(401).json({ error: "UNAUTHORIZED" });
      return;
    }

    req.actorId = req.userId;
    req.readOnly = Boolean(user.readOnly);
    if (user.parentUserId) {
      req.userId = user.parentUserId.toString();
    }
    next();
  } catch (error) {
    next(error);
  }
};

/** Block finance mutations for a read-only login. */
export const requireWritable: RequestHandler = (req, res, next) => {
  if (req.readOnly && req.method !== "GET" && req.method !== "HEAD") {
    res.status(403).json({ error: "READ_ONLY" });
    return;
  }
  next();
};

/** Block a route entirely for a read-only login, including reads. */
export const forbidReadOnly: RequestHandler = (req, res, next) => {
  if (req.readOnly) {
    res.status(403).json({ error: "READ_ONLY" });
    return;
  }
  next();
};
