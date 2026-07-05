import mongoose from "mongoose";
import { migrateMonthIndexes } from "./migrations.js";

export async function connectDb(
  uri: string = process.env.MONGODB_URI ?? "mongodb://localhost:27017/finance",
): Promise<void> {
  await mongoose.connect(uri);
  console.log("Connected to MongoDB");
  await migrateMonthIndexes();
}
