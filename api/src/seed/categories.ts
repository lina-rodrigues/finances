import "dotenv/config";
import { connectDb } from "../db/connection.js";
import { Category } from "../models/Category.js";

const MONGODB_URI = process.env.MONGODB_URI ?? "mongodb://localhost:27017/finance";

const seedCategories = [
  { name: "Income", order: 0, children: [{ name: "Salary", order: 0 }] },
  { name: "Housing", order: 1, children: [{ name: "Rent", order: 0 }, { name: "Utilities", order: 1 }] },
  { name: "Food", order: 2, children: [{ name: "Groceries", order: 0 }, { name: "Dining Out", order: 1 }] },
  { name: "Transport", order: 3, children: [{ name: "Fuel", order: 0 }, { name: "Public Transit", order: 1 }] },
  { name: "Other", order: 4, children: [] },
];

async function seed() {
  await connectDb(MONGODB_URI);

  const existing = await Category.countDocuments();
  if (existing > 0) {
    console.log("Categories already seeded, skipping.");
    process.exit(0);
  }

  for (const root of seedCategories) {
    const parent = await Category.create({
      name: root.name,
      parentId: null,
      order: root.order,
    });

    for (const child of root.children) {
      await Category.create({
        name: child.name,
        parentId: parent._id,
        order: child.order,
      });
    }
  }

  console.log("Categories seeded successfully.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
