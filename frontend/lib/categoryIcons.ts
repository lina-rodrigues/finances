/** Stable app icon keys (API) → Font Awesome icon names for `<wa-icon>`. */
export const CATEGORY_ICON_FA: Record<string, string> = {
  category: "folder",
  income: "money-bill",
  house: "house",
  building: "building",
  utensils: "utensils",
  car: "car",
  bus: "bus",
  cartShopping: "cart-shopping",
  bolt: "bolt",
  wifi: "wifi",
  heartPulse: "heart-pulse",
  graduationCap: "graduation-cap",
  plane: "plane",
  globe: "globe",
  gift: "gift",
  piggyBank: "piggy-bank",
  banknote: "money-bill-wave",
  briefcase: "briefcase",
  shirt: "shirt",
  film: "film",
  music: "music",
  dumbbell: "dumbbell",
  smartphone: "mobile",
  calendar: "calendar",
};

export const CATEGORY_ICON_KEYS = Object.keys(CATEGORY_ICON_FA);

export function resolveCategoryFaIcon(icon: string | null | undefined): string {
  if (!icon) return CATEGORY_ICON_FA.category;
  return CATEGORY_ICON_FA[icon] ?? CATEGORY_ICON_FA.category;
}

/** Normalize an API / draft icon key to a known category icon key. */
export function resolveCategoryIconKey(icon: string | null | undefined): string {
  if (!icon) return "category";
  return icon in CATEGORY_ICON_FA ? icon : "category";
}
