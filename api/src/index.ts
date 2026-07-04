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

async function main() {
  await connectDb();

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

  app.listen(PORT, () => {
    console.log(`API listening on http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error("Failed to start API:", err);
  process.exit(1);
});
