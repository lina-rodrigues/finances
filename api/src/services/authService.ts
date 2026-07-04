import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { Types } from "mongoose";
import { Category } from "../models/Category.js";
import { User, type AppLanguage, type IUser, type UserPreferences } from "../models/User.js";
import { getDefaultCategories } from "../constants/defaultCategories.js";
import { sendPasswordResetEmail } from "./emailService.js";

const BCRYPT_ROUNDS = 12;
const JWT_EXPIRES_IN = "7d";
const RESET_TOKEN_BYTES = 32;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }
  return secret;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function signToken(userId: Types.ObjectId | string): string {
  return jwt.sign({ userId: userId.toString() }, getJwtSecret(), { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): { userId: string } {
  const payload = jwt.verify(token, getJwtSecret()) as { userId: string };
  return payload;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}

function hashResetToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function toPublicUser(user: IUser) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    preferences: user.preferences,
  };
}

export async function seedDefaultCategoriesForUser(
  userId: Types.ObjectId,
  language: AppLanguage,
): Promise<void> {
  const categories = getDefaultCategories(language).map((cat) => ({
    ...cat,
    userId,
  }));
  await Category.insertMany(categories);
}

export async function registerUser(input: {
  name: string;
  email: string;
  password: string;
  invitationCode: string;
  language: AppLanguage;
  currency: string;
}): Promise<IUser> {
  const expectedCode = process.env.INVITATION_CODE;
  if (!expectedCode || input.invitationCode !== expectedCode) {
    throw new AuthError("INVALID_INVITATION_CODE", 403);
  }

  const email = normalizeEmail(input.email);
  const existing = await User.findOne({ email });
  if (existing) {
    throw new AuthError("EMAIL_ALREADY_EXISTS", 409);
  }

  const passwordHash = await hashPassword(input.password);
  const user = await User.create({
    name: input.name.trim(),
    email,
    passwordHash,
    preferences: {
      theme: null,
      currency: input.currency,
      language: input.language,
    },
  });

  await seedDefaultCategoriesForUser(user._id, input.language);
  return user;
}

export async function loginUser(email: string, password: string): Promise<IUser> {
  const user = await User.findOne({ email: normalizeEmail(email) });
  if (!user || !user.passwordHash) {
    throw new AuthError("INVALID_CREDENTIALS", 401);
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    throw new AuthError("INVALID_CREDENTIALS", 401);
  }

  return user;
}

export async function requestPasswordReset(email: string): Promise<void> {
  const user = await User.findOne({ email: normalizeEmail(email) });
  if (!user) {
    return;
  }

  const rawToken = crypto.randomBytes(RESET_TOKEN_BYTES).toString("hex");
  user.resetTokenHash = hashResetToken(rawToken);
  user.resetTokenExpiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);
  await user.save();

  await sendPasswordResetEmail(user.email, user.name, rawToken);
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const tokenHash = hashResetToken(token);
  const user = await User.findOne({
    resetTokenHash: tokenHash,
    resetTokenExpiresAt: { $gt: new Date() },
  });

  if (!user) {
    throw new AuthError("INVALID_OR_EXPIRED_TOKEN", 400);
  }

  user.passwordHash = await hashPassword(newPassword);
  user.resetTokenHash = null;
  user.resetTokenExpiresAt = null;
  await user.save();
}

export async function updateUserProfile(
  userId: string,
  updates: {
    name?: string;
    preferences?: Partial<UserPreferences>;
  },
): Promise<IUser> {
  const user = await User.findById(userId);
  if (!user) {
    throw new AuthError("USER_NOT_FOUND", 404);
  }

  if (updates.name !== undefined) {
    user.name = updates.name.trim();
  }

  if (updates.preferences) {
    if (updates.preferences.theme !== undefined) {
      user.preferences.theme = updates.preferences.theme;
    }
    if (updates.preferences.currency !== undefined) {
      user.preferences.currency = updates.preferences.currency;
    }
    if (updates.preferences.language !== undefined) {
      user.preferences.language = updates.preferences.language;
    }
  }

  await user.save();
  return user;
}

export class AuthError extends Error {
  constructor(
    public code: string,
    public status: number,
  ) {
    super(code);
    this.name = "AuthError";
  }
}
