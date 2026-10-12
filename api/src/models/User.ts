import mongoose, { Schema, type Document, type Types } from "mongoose";
import type { AiReportTone } from "../constants/aiReportTone.js";

export type ThemePreference = "light" | "dark" | null;
export type AppLanguage = "en" | "pt";

export interface UserPreferences {
  theme: ThemePreference;
  currency: string;
  language: AppLanguage;
  aiReportTone: AiReportTone;
}

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string | null;
  readOnly: boolean;
  parentUserId: Types.ObjectId | null;
  preferences: UserPreferences;
  resetTokenHash: string | null;
  resetTokenExpiresAt: Date | null;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, default: null },
    readOnly: { type: Boolean, default: false },
    parentUserId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    preferences: {
      theme: { type: String, default: null, enum: ["light", "dark", null] },
      currency: { type: String, default: "USD" },
      language: { type: String, default: "en", enum: ["en", "pt"] },
      aiReportTone: { type: String, default: "normal", enum: ["normal", "formal", "technical", "informal"] },
    },
    resetTokenHash: { type: String, default: null },
    resetTokenExpiresAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export const User = mongoose.model<IUser>("User", userSchema);
