"use client";

import { useTranslation } from "@/lib/i18n";

/**
 * Shown on line item rows while an optimistic mutation is in flight (Tier 1).
 * Uses the same icon + color + label pattern as the planned badge.
 */
export function PendingBadge() {
  const { t } = useTranslation();

  return (
    <wa-badge variant="warning" appearance="outlined">
      <span className="wa-cluster wa-gap-2xs wa-align-items-center">
        <wa-icon name="arrows-rotate"></wa-icon>
        {t("categories.pendingBadge")}
      </span>
    </wa-badge>
  );
}
