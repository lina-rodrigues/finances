import "dotenv/config";
import { connectDb } from "../db/connection.js";
import { Category } from "../models/Category.js";

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
  await connectDb();

  const existing = await Category.countDocuments();
  if (existing > 0) {
    console.log("Categories already seeded, skipping.");
    process.exit(0);
  }

  await Category.insertMany(seedCategories);

  console.log("Categories seeded successfully.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
