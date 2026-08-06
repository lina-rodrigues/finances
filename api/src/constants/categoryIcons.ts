/** Stable icon keys stored on categories. Frontend maps these to Font Awesome names. */
export const ALLOWED_CATEGORY_ICONS = [
  "category",
  "income",
  "house",
  "building",
  "utensils",
  "car",
  "bus",
  "cartShopping",
  "bolt",
  "wifi",
  "heartPulse",
  "graduationCap",
  "plane",
  "globe",
  "gift",
  "piggyBank",
  "banknote",
  "briefcase",
  "shirt",
  "film",
  "music",
  "dumbbell",
  "smartphone",
  "calendar",
] as const;

export type CategoryIconKey = (typeof ALLOWED_CATEGORY_ICONS)[number];

export const DEFAULT_CATEGORY_ICON: CategoryIconKey = "category";

export function isAllowedCategoryIcon(value: string): value is CategoryIconKey {
  return (ALLOWED_CATEGORY_ICONS as readonly string[]).includes(value);
}
