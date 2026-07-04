import mongoose from "mongoose";

export async function connectDb(
  uri: string = process.env.MONGODB_URI ?? "mongodb://localhost:27017/finance",
): Promise<void> {
  await mongoose.connect(uri);
  console.log("Connected to MongoDB");
}
