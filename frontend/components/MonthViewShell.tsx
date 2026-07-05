"use client";

import type { ReactNode } from "react";
import { MonthViewProvider, type MonthViewState } from "@/lib/MonthViewProvider";

interface MonthViewShellProps {
  initialData: MonthViewState;
  children: ReactNode;
}

export function MonthViewShell({ initialData, children }: MonthViewShellProps) {
  return <MonthViewProvider initialData={initialData}>{children}</MonthViewProvider>;
}
