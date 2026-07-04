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
  uncategorized: LineItem[];
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

async function apiFetch(path: string, errorLabel: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(`${getApiUrl()}${path}`, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message =
      typeof body.error === "string" ? body.error : `Failed to ${errorLabel}: ${res.statusText}`;
    throw new Error(message);
  }
  return res;
}

function jsonInit(method: "POST" | "PATCH", data: unknown): RequestInit {
  return {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  };
}

export async function fetchMonthView(yearMonth?: string): Promise<MonthView> {
  const path = yearMonth ? `/months/${yearMonth}` : "/months/current";
  const res = await apiFetch(path, "fetch month view", { cache: "no-store" });
  return res.json();
}

export async function fetchCategories(): Promise<FlatCategory[]> {
  const res = await apiFetch("/categories", "fetch categories", { cache: "no-store" });
  return res.json();
}

export async function createCategory(data: {
  name: string;
  icon?: string;
  order?: number;
}): Promise<FlatCategory> {
  const res = await apiFetch("/categories", "create category", jsonInit("POST", data));
  return res.json();
}

export async function updateCategory(
  id: string,
  data: Partial<{ name: string; icon: string; order: number }>,
): Promise<FlatCategory> {
  const res = await apiFetch(`/categories/${id}`, "update category", jsonInit("PATCH", data));
  return res.json();
}

export async function reorderCategories(
  items: { id: string; order: number }[],
): Promise<FlatCategory[]> {
  const res = await apiFetch(
    "/categories/reorder",
    "reorder categories",
    jsonInit("PATCH", { items }),
  );
  return res.json();
}

export async function deleteCategory(id: string): Promise<void> {
  await apiFetch(`/categories/${id}`, "delete category", { method: "DELETE" });
}

export async function createLineItem(
  yearMonth: string,
  data: {
    categoryId: string | null;
    type: LineItemType;
    label: string;
    plannedAmount: number;
    realizedAmount?: number | null;
  },
): Promise<void> {
  await apiFetch(`/months/${yearMonth}/line-items`, "create line item", jsonInit("POST", data));
}

export async function updateLineItem(
  id: string,
  data: Partial<{
    categoryId: string | null;
    type: LineItemType;
    label: string;
    plannedAmount: number;
    realizedAmount: number | null;
  }>,
): Promise<void> {
  await apiFetch(`/line-items/${id}`, "update line item", jsonInit("PATCH", data));
}

export async function deleteLineItem(id: string): Promise<void> {
  await apiFetch(`/line-items/${id}`, "delete line item", { method: "DELETE" });
}

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export function formatCurrency(amount: number): string {
  return currencyFormatter.format(amount);
}

export function getCurrentYearMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function prevYearMonth(yearMonth: string): string {
  const [yearStr, monthStr] = yearMonth.split("-");
  let year = parseInt(yearStr, 10);
  let month = parseInt(monthStr, 10) - 1;
  if (month < 1) {
    month = 12;
    year -= 1;
  }
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function nextYearMonth(yearMonth: string): string {
  const [yearStr, monthStr] = yearMonth.split("-");
  let year = parseInt(yearStr, 10);
  let month = parseInt(monthStr, 10) + 1;
  if (month > 12) {
    month = 1;
    year += 1;
  }
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function monthPagePath(yearMonth: string): string {
  return yearMonth === getCurrentYearMonth() ? "/" : `/?month=${yearMonth}`;
}
