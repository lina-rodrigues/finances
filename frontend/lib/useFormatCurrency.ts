"use client";

import { useAuth } from "@/lib/AuthProvider";
import { formatCurrency, getLocaleTag } from "@/lib/api";

export function useFormatCurrency() {
  const { preferences } = useAuth();
  const localeTag = getLocaleTag(preferences.language);

  return (amount: number) => formatCurrency(amount, preferences.currency, localeTag);
}
