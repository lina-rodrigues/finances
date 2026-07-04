import "dotenv/config";
import bcrypt from "bcryptjs";
import { connectDb } from "../db/connection.js";
import { User } from "../models/User.js";
import { Category } from "../models/Category.js";
import { Month } from "../models/Month.js";
import { LineItem, type LineItemType } from "../models/LineItem.js";
import { computeEndingBalance } from "../services/balanceService.js";
import {
  DEFAULT_CATEGORY_DEFS,
  getDefaultCategories,
} from "../constants/defaultCategories.js";
import { getCurrentYearMonth, nextYearMonth, previousYearMonth } from "../utils/yearMonth.js";

interface SeedLineItem {
  categoryKey: string | null;
  type: LineItemType;
  label: string;
  planned: number;
  realized: number | null;
}

const previousMonthItems: SeedLineItem[] = [
  { categoryKey: "salary", type: "income", label: "Monthly salary", planned: 5000, realized: 5000 },
  { categoryKey: "salary", type: "income", label: "Freelance project", planned: 400, realized: 550 },
  { categoryKey: "rent", type: "expense", label: "Apartment rent", planned: 1800, realized: 1800 },
  { categoryKey: "utilities", type: "expense", label: "Electricity", planned: 120, realized: 104.35 },
  { categoryKey: "utilities", type: "expense", label: "Internet", planned: 60, realized: 60 },
  { categoryKey: "groceries", type: "expense", label: "Supermarket runs", planned: 600, realized: 683.42 },
  { categoryKey: "diningOut", type: "expense", label: "Restaurants", planned: 250, realized: 312.8 },
  { categoryKey: "fuel", type: "expense", label: "Gas", planned: 150, realized: 138.5 },
  { categoryKey: "publicTransit", type: "expense", label: "Transit pass", planned: 80, realized: 80 },
  { categoryKey: "other", type: "expense", label: "Miscellaneous", planned: 100, realized: 74.99 },
];

const currentMonthItems: SeedLineItem[] = [
  { categoryKey: "salary", type: "income", label: "Monthly salary", planned: 5000, realized: 5000 },
  { categoryKey: "rent", type: "expense", label: "Apartment rent", planned: 1800, realized: 1800 },
  { categoryKey: "utilities", type: "expense", label: "Electricity", planned: 120, realized: 97.2 },
  { categoryKey: "utilities", type: "expense", label: "Internet", planned: 60, realized: null },
  { categoryKey: "groceries", type: "expense", label: "Supermarket runs", planned: 650, realized: 289.75 },
  { categoryKey: "diningOut", type: "expense", label: "Restaurants", planned: 250, realized: null },
  { categoryKey: "fuel", type: "expense", label: "Gas", planned: 150, realized: 62.3 },
  { categoryKey: "publicTransit", type: "expense", label: "Transit pass", planned: 80, realized: 80 },
  { categoryKey: "other", type: "expense", label: "Miscellaneous", planned: 100, realized: null },
  { categoryKey: null, type: "expense", label: "One-off purchase", planned: 45, realized: null },
];

const nextMonthItems: SeedLineItem[] = [
  { categoryKey: "salary", type: "income", label: "Monthly salary", planned: 5000, realized: null },
  { categoryKey: "rent", type: "expense", label: "Apartment rent", planned: 1800, realized: null },
  { categoryKey: "utilities", type: "expense", label: "Electricity", planned: 120, realized: null },
  { categoryKey: "utilities", type: "expense", label: "Internet", planned: 60, realized: null },
  { categoryKey: "groceries", type: "expense", label: "Supermarket runs", planned: 650, realized: null },
  { categoryKey: "diningOut", type: "expense", label: "Restaurants", planned: 250, realized: null },
  { categoryKey: "fuel", type: "expense", label: "Gas", planned: 150, realized: null },
  { categoryKey: "publicTransit", type: "expense", label: "Transit pass", planned: 80, realized: null },
  { categoryKey: "other", type: "expense", label: "Miscellaneous", planned: 100, realized: null },
];

async function ensureDevUser(): Promise<string> {
  const email = process.env.SEED_DEV_EMAIL ?? "dev@finance.local";
  const password = process.env.SEED_DEV_PASSWORD ?? "password123";
  const name = process.env.SEED_DEV_NAME ?? "Dev User";

  let user = await User.findOne({ email });
  if (!user) {
    const passwordHash = await bcrypt.hash(password, 12);
    user = await User.create({
      name,
      email,
      passwordHash,
      preferences: { theme: null, currency: "USD", language: "en" },
    });
    console.log(`Created dev user: ${email}`);
  }

  return user._id.toString();
}

async function seedCategoriesIfNeeded(userId: string): Promise<Map<string, string>> {
  const existing = await Category.countDocuments({ userId });
  if (existing === 0) {
    const categories = getDefaultCategories("en").map((cat) => ({ ...cat, userId }));
    await Category.insertMany(categories);
    console.log("Categories seeded successfully.");
  } else {
    console.log("Categories already seeded for user, skipping.");
  }

  const byOrder = await Category.find({ userId }).sort({ order: 1 });
  const map = new Map<string, string>();
  DEFAULT_CATEGORY_DEFS.forEach((def, index) => {
    const cat = byOrder[index];
    if (cat) {
      map.set(def.key, cat._id.toString());
    }
  });
  return map;
}

async function seedMonth(
  userId: string,
  yearMonth: string,
  lastMonthBalance: number,
  items: SeedLineItem[],
  categoryIds: Map<string, string>,
): Promise<number> {
  const month = await Month.create({ userId, yearMonth, lastMonthBalance });

  await LineItem.insertMany(
    items.map((item) => {
      const categoryId = item.categoryKey ? categoryIds.get(item.categoryKey) : null;
      if (item.categoryKey && !categoryId) {
        throw new Error(`Category key "${item.categoryKey}" not found; cannot seed line items.`);
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
      User.deleteMany({}),
    ]);
    console.log("Cleared existing users, categories, months, and line items.");
  }

  const userId = await ensureDevUser();
  const categoryIds = await seedCategoriesIfNeeded(userId);

  const existingItems = await LineItem.countDocuments({});
  if (existingItems > 0) {
    console.log("Line items already exist, skipping month seeding. Use --fresh to reseed from scratch.");
    process.exit(0);
  }

  const current = getCurrentYearMonth();
  const previous = previousYearMonth(current);
  const next = nextYearMonth(current);

  let balance = 1500;
  balance = await seedMonth(userId, previous, balance, previousMonthItems, categoryIds);
  balance = await seedMonth(userId, current, balance, currentMonthItems, categoryIds);
  await seedMonth(userId, next, balance, nextMonthItems, categoryIds);

  console.log("Seed completed successfully.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
