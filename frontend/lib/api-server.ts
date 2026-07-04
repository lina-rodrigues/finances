import { cookies } from "next/headers";
import { getApiUrl, type MonthView } from "@/lib/api";

async function serverApiFetch(path: string, errorLabel: string): Promise<Response> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  const res = await fetch(`${getApiUrl()}${path}`, {
    cache: "no-store",
    headers: cookieHeader ? { Cookie: cookieHeader } : {},
  });

  if (res.status === 401) {
    throw new Error("UNAUTHORIZED");
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message =
      typeof body.error === "string" ? body.error : `Failed to ${errorLabel}: ${res.statusText}`;
    throw new Error(message);
  }

  return res;
}

export async function fetchMonthView(yearMonth?: string): Promise<MonthView> {
  const path = yearMonth ? `/months/${yearMonth}` : "/months/current";
  const res = await serverApiFetch(path, "fetch month view");
  return res.json();
}
