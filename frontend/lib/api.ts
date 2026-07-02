export type LineItemType = "income" | "expense";

export interface LineItem {
  id: string;
  type: LineItemType;
  label: string;
  plannedAmount: number;
  realizedAmount: number | null;
  displayAmount: number;
  isRealized: boolean;
}

export interface Category {
  id: string;
  name: string;
  order: number;
  icon: string;
  lineItems: LineItem[];
}

export interface MonthView {
  month: {
    id: string;
    yearMonth: string;
    lastMonthBalance: number;
    endingBalance: number;
  };
  categories: Category[];
}

export interface FlatCategory {
  id: string;
  name: string;
  order: number;
  icon: string;
}

function getApiUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
}

export async function fetchMonthView(yearMonth?: string): Promise<MonthView> {
  const url = yearMonth
    ? `${getApiUrl()}/months/${yearMonth}`
    : `${getApiUrl()}/months/current`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch month view: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchCategories(): Promise<FlatCategory[]> {
  const res = await fetch(`${getApiUrl()}/categories`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch categories: ${res.statusText}`);
  }
  return res.json();
}

export async function createCategory(data: {
  name: string;
  icon?: string;
  order?: number;
}): Promise<FlatCategory> {
  const res = await fetch(`${getApiUrl()}/categories`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    throw new Error(`Failed to create category: ${res.statusText}`);
  }
  return res.json();
}

export async function updateCategory(
  id: string,
  data: Partial<{ name: string; icon: string; order: number }>,
): Promise<FlatCategory> {
  const res = await fetch(`${getApiUrl()}/categories/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    throw new Error(`Failed to update category: ${res.statusText}`);
  }
  return res.json();
}

export async function reorderCategories(
  items: { id: string; order: number }[],
): Promise<FlatCategory[]> {
  const res = await fetch(`${getApiUrl()}/categories/reorder`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items }),
  });
  if (!res.ok) {
    throw new Error(`Failed to reorder categories: ${res.statusText}`);
  }
  return res.json();
}

export async function deleteCategory(id: string): Promise<void> {
  const res = await fetch(`${getApiUrl()}/categories/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message =
      typeof body.error === "string" ? body.error : `Failed to delete category: ${res.statusText}`;
    throw new Error(message);
  }
}

export async function createLineItem(
  yearMonth: string,
  data: {
    categoryId: string;
    type: LineItemType;
    label: string;
    plannedAmount: number;
    realizedAmount?: number | null;
  },
): Promise<void> {
  const res = await fetch(`${getApiUrl()}/months/${yearMonth}/line-items`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    throw new Error(`Failed to create line item: ${res.statusText}`);
  }
}

export async function updateLineItem(
  id: string,
  data: Partial<{
    categoryId: string;
    type: LineItemType;
    label: string;
    plannedAmount: number;
    realizedAmount: number | null;
  }>,
): Promise<void> {
  const res = await fetch(`${getApiUrl()}/line-items/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    throw new Error(`Failed to update line item: ${res.statusText}`);
  }
}

export async function deleteLineItem(id: string): Promise<void> {
  const res = await fetch(`${getApiUrl()}/line-items/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    throw new Error(`Failed to delete line item: ${res.statusText}`);
  }
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export function formatYearMonthLabel(yearMonth: string): string {
  const [yearStr, monthStr] = yearMonth.split("-");
  const date = new Date(parseInt(yearStr, 10), parseInt(monthStr, 10) - 1, 1);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}
