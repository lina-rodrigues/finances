export type LineItemType = "income" | "expense";

export type RecurrenceEndType = "never" | "count" | "until";

export type RecurrenceScope = "this" | "future" | "all";

export interface RecurrenceInput {
  startYearMonth: string;
  endType: RecurrenceEndType;
  occurrenceCount?: number;
  endYearMonth?: string;
}

export interface LineItemMutationResponse {
  id: string;
  type: LineItemType;
  label: string;
  plannedAmount: number;
  realizedAmount: number | null;
  seriesId: string | null;
  seriesOccurrenceIndex: number | null;
  isSeriesException: boolean;
}

export interface LineItem {
  id: string;
  type: LineItemType;
  label: string;
  plannedAmount: number;
  realizedAmount: number | null;
  displayAmount: number;
  isRealized: boolean;
  seriesId: string | null;
  seriesOccurrenceIndex: number | null;
  seriesEndType: RecurrenceEndType | null;
  seriesOccurrenceCount: number | null;
  seriesEndYearMonth: string | null;
  isSeriesException: boolean;
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

export function getApiUrl(): string {
  // Browser requests use the Next.js rewrite so auth cookies are set on the
  // frontend origin (middleware + SSR read cookies from this host).
  if (typeof window !== "undefined") {
    return "/api";
  }
  // Server components call the backend directly and forward incoming cookies.
  return process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
}

async function apiFetch(path: string, errorLabel: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(`${getApiUrl()}${path}`, {
    credentials: "include",
    ...init,
  });

  if (res.status === 401 && typeof window !== "undefined") {
    window.location.href = "/login";
  }

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
    recurrence?: RecurrenceInput;
  },
): Promise<LineItemMutationResponse> {
  const res = await apiFetch(`/months/${yearMonth}/line-items`, "create line item", jsonInit("POST", data));
  return res.json();
}

export async function updateLineItem(
  id: string,
  data: Partial<{
    categoryId: string | null;
    type: LineItemType;
    label: string;
    plannedAmount: number;
    realizedAmount: number | null;
    scope: RecurrenceScope;
  }>,
): Promise<LineItemMutationResponse> {
  const res = await apiFetch(`/line-items/${id}`, "update line item", jsonInit("PATCH", data));
  return res.json();
}

export async function deleteLineItem(
  id: string,
  options?: { scope?: RecurrenceScope },
): Promise<void> {
  await apiFetch(`/line-items/${id}`, "delete line item", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(options ?? {}),
  });
}

export async function convertLineItemToRecurrence(
  id: string,
  recurrence: RecurrenceInput,
): Promise<LineItemMutationResponse> {
  const res = await apiFetch(
    `/line-items/${id}/recurrence`,
    "convert line item to recurrence",
    jsonInit("POST", recurrence),
  );
  return res.json();
}

export async function cancelRecurrenceSeries(
  id: string,
  fromYearMonth: string,
): Promise<void> {
  await apiFetch(
    `/recurrence-series/${id}/cancel`,
    "cancel recurrence series",
    jsonInit("POST", { fromYearMonth }),
  );
}

export function formatCurrency(
  amount: number,
  currency = "USD",
  locale = "en-US",
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(amount);
}

export function getLocaleTag(language: "en" | "pt"): string {
  return language === "pt" ? "pt-BR" : "en-US";
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

export function monthPagePath(
  yearMonth: string,
  tab: "categories" | "reports" = "categories",
): string {
  return navPath(tab, yearMonth);
}

export type AppTab = "finance" | "categories" | "reports";

export function navPath(tab: AppTab, yearMonth?: string): string {
  const month = yearMonth ?? getCurrentYearMonth();
  const current = getCurrentYearMonth();

  switch (tab) {
    case "finance":
      return "/";
    case "categories":
      return month === current ? "/categories" : `/categories?month=${month}`;
    case "reports":
      return month === current ? "/reports" : `/reports?month=${month}`;
  }
}
