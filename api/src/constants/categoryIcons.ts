export const ALLOWED_CATEGORY_ICONS = [
  "category",
  "income",
  "house",
  "utensils",
  "car",
  "cartShopping",
  "bolt",
  "heartPulse",
  "graduationCap",
  "plane",
  "gift",
  "piggyBank",
  "briefcase",
  "shirt",
  "film",
  "dumbbell",
] as const;

export type CategoryIconKey = (typeof ALLOWED_CATEGORY_ICONS)[number];

export const DEFAULT_CATEGORY_ICON: CategoryIconKey = "category";

export function isAllowedCategoryIcon(value: string): value is CategoryIconKey {
  return (ALLOWED_CATEGORY_ICONS as readonly string[]).includes(value);
}
