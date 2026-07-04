import "dotenv/config";
import { connectDb } from "../db/connection.js";
import { Category } from "../models/Category.js";
import { Month } from "../models/Month.js";
import { LineItem, type LineItemType } from "../models/LineItem.js";
import { computeEndingBalance } from "../services/balanceService.js";
import { getCurrentYearMonth, nextYearMonth, previousYearMonth } from "../utils/yearMonth.js";

const seedCategories = [
  { name: "Salary", order: 0, icon: "income" },
  { name: "Rent", order: 1, icon: "house" },
  { name: "Utilities", order: 2, icon: "bolt" },
  { name: "Groceries", order: 3, icon: "cartShopping" },
  { name: "Dining Out", order: 4, icon: "utensils" },
  { name: "Fuel", order: 5, icon: "car" },
  { name: "Public Transit", order: 6, icon: "car" },
  // Intentionally receives no line items in any month, to showcase a category's empty state.
  { name: "Entertainment", order: 7, icon: "film" },
  { name: "Other", order: 8, icon: "category" },
];

interface SeedLineItem {
  category: string;
  type: LineItemType;
  label: string;
  planned: number;
  realized: number | null;
}

// Previous month: everything realized, with actuals slightly off from plan.
const previousMonthItems: SeedLineItem[] = [
  { category: "Salary", type: "income", label: "Monthly salary", planned: 5000, realized: 5000 },
  { category: "Salary", type: "income", label: "Freelance project", planned: 400, realized: 550 },
  { category: "Rent", type: "expense", label: "Apartment rent", planned: 1800, realized: 1800 },
  { category: "Utilities", type: "expense", label: "Electricity", planned: 120, realized: 104.35 },
  { category: "Utilities", type: "expense", label: "Internet", planned: 60, realized: 60 },
  { category: "Groceries", type: "expense", label: "Supermarket runs", planned: 600, realized: 683.42 },
  { category: "Dining Out", type: "expense", label: "Restaurants", planned: 250, realized: 312.8 },
  { category: "Fuel", type: "expense", label: "Gas", planned: 150, realized: 138.5 },
  { category: "Public Transit", type: "expense", label: "Transit pass", planned: 80, realized: 80 },
  { category: "Other", type: "expense", label: "Miscellaneous", planned: 100, realized: 74.99 },
];

// Current month: a mix of realized and still-planned items.
const currentMonthItems: SeedLineItem[] = [
  { category: "Salary", type: "income", label: "Monthly salary", planned: 5000, realized: 5000 },
  { category: "Rent", type: "expense", label: "Apartment rent", planned: 1800, realized: 1800 },
  { category: "Utilities", type: "expense", label: "Electricity", planned: 120, realized: 97.2 },
  { category: "Utilities", type: "expense", label: "Internet", planned: 60, realized: null },
  { category: "Groceries", type: "expense", label: "Supermarket runs", planned: 650, realized: 289.75 },
  { category: "Dining Out", type: "expense", label: "Restaurants", planned: 250, realized: null },
  { category: "Fuel", type: "expense", label: "Gas", planned: 150, realized: 62.3 },
  { category: "Public Transit", type: "expense", label: "Transit pass", planned: 80, realized: 80 },
  { category: "Other", type: "expense", label: "Miscellaneous", planned: 100, realized: null },
];

// Next month: predictions only.
const nextMonthItems: SeedLineItem[] = [
  { category: "Salary", type: "income", label: "Monthly salary", planned: 5000, realized: null },
  { category: "Rent", type: "expense", label: "Apartment rent", planned: 1800, realized: null },
  { category: "Utilities", type: "expense", label: "Electricity", planned: 120, realized: null },
  { category: "Utilities", type: "expense", label: "Internet", planned: 60, realized: null },
  { category: "Groceries", type: "expense", label: "Supermarket runs", planned: 650, realized: null },
  { category: "Dining Out", type: "expense", label: "Restaurants", planned: 250, realized: null },
  { category: "Fuel", type: "expense", label: "Gas", planned: 150, realized: null },
  { category: "Public Transit", type: "expense", label: "Transit pass", planned: 80, realized: null },
  { category: "Other", type: "expense", label: "Miscellaneous", planned: 100, realized: null },
];

async function seedCategoriesIfNeeded(): Promise<Map<string, string>> {
  const existing = await Category.countDocuments();
  if (existing > 0) {
    console.log("Categories already seeded, skipping.");
  } else {
    await Category.insertMany(seedCategories);
    console.log("Categories seeded successfully.");
  }

  const categories = await Category.find();
  return new Map(categories.map((cat) => [cat.name, cat._id.toString()]));
}

async function seedMonth(
  yearMonth: string,
  lastMonthBalance: number,
  items: SeedLineItem[],
  categoryIds: Map<string, string>,
): Promise<number> {
  const month = await Month.create({ yearMonth, lastMonthBalance });

  await LineItem.insertMany(
    items.map((item) => {
      const categoryId = categoryIds.get(item.category);
      if (!categoryId) {
        throw new Error(`Category "${item.category}" not found; cannot seed line items.`);
      }
      return {
        monthId: month._id,
        categoryId,
        type: item.type,
        label: item.label,
        plannedAmount: item.planned,
        realizedAmount: item.realized,
      };
    }),
  );

  console.log(`Seeded ${items.length} line items for ${yearMonth}.`);
  const endingBalance = await computeEndingBalance(month);
  return Math.round(endingBalance * 100) / 100;
}

async function seed() {
  const fresh = process.argv.includes("--fresh");

  await connectDb();

  if (fresh) {
    await Promise.all([
      LineItem.deleteMany({}),
      Month.deleteMany({}),
      Category.deleteMany({}),
    ]);
    console.log("Cleared existing categories, months, and line items.");
  }

  const categoryIds = await seedCategoriesIfNeeded();

  const existingItems = await LineItem.countDocuments();
  if (existingItems > 0) {
    console.log("Line items already exist, skipping month seeding. Use --fresh to reseed from scratch.");
    process.exit(0);
  }

  const current = getCurrentYearMonth();
  const previous = previousYearMonth(current);
  const next = nextYearMonth(current);

  let balance = 1500;
  balance = await seedMonth(previous, balance, previousMonthItems, categoryIds);
  balance = await seedMonth(current, balance, currentMonthItems, categoryIds);
  await seedMonth(next, balance, nextMonthItems, categoryIds);

  console.log("Seed completed successfully.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
