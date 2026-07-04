import { z } from "zod";

export const localeHintsSchema = z
  .object({
    timezone: z.string().optional(),
    language: z.string().optional(),
  })
  .optional();

export const registerSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8),
  invitationCode: z.string().min(1),
  localeHints: localeHintsSchema,
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
});

export const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  preferences: z
    .object({
      theme: z.union([z.enum(["light", "dark"]), z.null()]).optional(),
      currency: z.string().min(3).max(3).optional(),
      language: z.enum(["en", "pt"]).optional(),
    })
    .optional(),
});
