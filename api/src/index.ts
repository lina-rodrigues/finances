import "dotenv/config";
import express from "express";
import cors from "cors";
import { connectDb } from "./db/connection.js";
import categoriesRouter from "./routes/categories.js";
import monthsRouter from "./routes/months.js";
import lineItemsRouter from "./routes/lineItems.js";
import { errorHandler } from "./middleware/errorHandler.js";

const PORT = parseInt(process.env.PORT ?? "4000", 10);
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? "http://localhost:3000";

const app = express();
app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/categories", categoriesRouter);
app.use("/months", monthsRouter);
app.use("/line-items", lineItemsRouter);

app.use(errorHandler);

try {
  await connectDb();
} catch (err) {
  console.error("Failed to connect to MongoDB:", err);
  if (!process.env.VERCEL) {
    process.exit(1);
  }
}

// On Vercel the app is exported and invoked as a serverless function;
// locally we run a long-lived server.
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`API listening on http://localhost:${PORT}`);
  });
}

export default app;
