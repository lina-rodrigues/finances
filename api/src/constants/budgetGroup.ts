export const BUDGET_GROUPS = ["essential", "non_essential", "investment"] as const;

export type BudgetGroup = (typeof BUDGET_GROUPS)[number];

export const BUDGET_GROUP_TARGETS: Record<BudgetGroup, number> = {
  essential: 50,
  non_essential: 30,
  investment: 20,
};

export const DEFAULT_BUDGET_GROUP: BudgetGroup = "non_essential";

export function isBudgetGroup(value: unknown): value is BudgetGroup {
  return typeof value === "string" && (BUDGET_GROUPS as readonly string[]).includes(value);
}

/** Stored null on category → non_essential for math and display. */
export function resolveBudgetGroup(budgetGroup: BudgetGroup | null | undefined): BudgetGroup {
  if (budgetGroup && isBudgetGroup(budgetGroup)) {
    return budgetGroup;
  }
  return DEFAULT_BUDGET_GROUP;
}
