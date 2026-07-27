import type { Category, FlatCategory } from "@/lib/api";
import type { IconName } from "@lina-rodrigues/cotton-candy";
const TEMP_CATEGORY_PREFIX = "temp-cat-";

export function createTempCategoryId(): string {
  return `${TEMP_CATEGORY_PREFIX}${crypto.randomUUID()}`;
}

export function isTempCategoryId(id: string): boolean {
  return id.startsWith(TEMP_CATEGORY_PREFIX);
}

export function buildOptimisticCategory(
  id: string,
  name: string,
  icon: string,
  order: number,
): { category: Category; flatCategory: FlatCategory } {
  const flatCategory: FlatCategory = { id, name, icon, order, budgetGroup: null };
  return {
    flatCategory,
    category: { ...flatCategory, lineItems: [] },
  };
}
