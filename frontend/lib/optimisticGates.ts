import type { RecurrenceScope } from "@/lib/api";
import type { RepeatMode } from "@/lib/recurrence";

export function canOptimisticallyDelete(scope?: RecurrenceScope): boolean {
  return !scope || scope === "this";
}

export function canOptimisticallyCreate(repeatMode: RepeatMode, needsNewCategory: boolean): boolean {
  return repeatMode === "none" && !needsNewCategory;
}

export function canOptimisticallyEdit(scope?: RecurrenceScope): boolean {
  return !scope || scope === "this";
}
