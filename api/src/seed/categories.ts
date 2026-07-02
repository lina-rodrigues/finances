import "dotenv/config";
import { connectDb } from "../db/connection.js";
import { Category } from "../models/Category.js";
import { DEFAULT_CATEGORY_ICON } from "../constants/categoryIcons.js";

const MONGODB_URI = process.env.MONGODB_URI ?? "mongodb://localhost:27017/finance";

const seedCategories = [
  { name: "Salary", order: 0, icon: "income" },
  { name: "Rent", order: 1, icon: "house" },
  { name: "Utilities", order: 2, icon: "bolt" },
  { name: "Groceries", order: 3, icon: "cartShopping" },
  { name: "Dining Out", order: 4, icon: "utensils" },
  { name: "Fuel", order: 5, icon: "car" },
  { name: "Public Transit", order: 6, icon: "car" },
  { name: "Other", order: 7, icon: "category" },
];

async function seed() {
  await connectDb(MONGODB_URI);

  const existing = await Category.countDocuments();
  if (existing > 0) {
    console.log("Categories already seeded, skipping.");
    process.exit(0);
  }

  for (const cat of seedCategories) {
    await Category.create({
      name: cat.name,
      order: cat.order,
      icon: cat.icon ?? DEFAULT_CATEGORY_ICON,
    });
  }

  console.log("Categories seeded successfully.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
