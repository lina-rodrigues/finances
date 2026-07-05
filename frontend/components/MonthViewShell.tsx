"use client";

import { useLayoutEffect, useState, type ReactNode } from "react";
import { getCurrentYearMonth } from "@/lib/api";
import {
  createEmptyMonthViewState,
  MonthViewProvider,
  monthViewDataKey,
  seedMonthViewFromServer,
  useMonthView,
  useMonthViewActions,
  type MonthViewState,
} from "@/lib/MonthViewProvider";

export function AppMonthViewProvider({ children }: { children: ReactNode }) {
  const [initialData] = useState(() => createEmptyMonthViewState(getCurrentYearMonth()));

  return <MonthViewProvider initialData={initialData}>{children}</MonthViewProvider>;
}

export function MonthViewSeed({ initialData }: { initialData: MonthViewState }) {
  const { pendingItemIds } = useMonthView();
  const { setFromServer } = useMonthViewActions();
  const dataKey = monthViewDataKey(initialData);

  useLayoutEffect(() => {
    seedMonthViewFromServer(initialData, pendingItemIds, setFromServer);
  }, [dataKey, initialData, pendingItemIds, setFromServer]);

  return null;
}
