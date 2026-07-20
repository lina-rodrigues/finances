import type { BudgetGroup } from "./budgetGroup.js";

export type AppLanguage = "en" | "pt";

export interface DefaultCategoryDef {
  key: string;
  order: number;
  icon: string;
  en: string;
  pt: string;
  budgetGroup: BudgetGroup | null;
}

export const DEFAULT_CATEGORY_DEFS: DefaultCategoryDef[] = [
  { key: "salary", order: 0, icon: "income", en: "Salary", pt: "Salário", budgetGroup: null },
  { key: "rent", order: 1, icon: "house", en: "Rent", pt: "Aluguel", budgetGroup: "essential" },
  { key: "utilities", order: 2, icon: "bolt", en: "Utilities", pt: "Contas", budgetGroup: "essential" },
  { key: "groceries", order: 3, icon: "cartShopping", en: "Groceries", pt: "Mercado", budgetGroup: "essential" },
  { key: "diningOut", order: 4, icon: "utensils", en: "Dining Out", pt: "Restaurantes", budgetGroup: "non_essential" },
  { key: "fuel", order: 5, icon: "car", en: "Fuel", pt: "Combustível", budgetGroup: "essential" },
  { key: "publicTransit", order: 6, icon: "car", en: "Public Transit", pt: "Transporte público", budgetGroup: "essential" },
  { key: "entertainment", order: 7, icon: "film", en: "Entertainment", pt: "Entretenimento", budgetGroup: "non_essential" },
  { key: "other", order: 8, icon: "category", en: "Other", pt: "Outros", budgetGroup: "non_essential" },
];

export function getDefaultCategories(language: AppLanguage): {
  name: string;
  order: number;
  icon: string;
  budgetGroup: BudgetGroup | null;
}[] {
  return DEFAULT_CATEGORY_DEFS.map((def) => ({
    name: language === "pt" ? def.pt : def.en,
    order: def.order,
    icon: def.icon,
    budgetGroup: def.budgetGroup,
  }));
}

/** Map English seed category names to keys for demo data seeding. */
export const SEED_CATEGORY_KEY_BY_EN_NAME = Object.fromEntries(
  DEFAULT_CATEGORY_DEFS.map((def) => [def.en, def.key]),
) as Record<string, string>;

export function getCategoryNameForKey(key: string, language: AppLanguage): string {
  const def = DEFAULT_CATEGORY_DEFS.find((d) => d.key === key);
  if (!def) {
    return key;
  }
  return language === "pt" ? def.pt : def.en;
}
