"use client";

import { Icon } from "@/components/Icon";
import { Badge } from "@/components/ui/pixelact-ui/badge";
import { useTranslation } from "@/lib/i18n";

/**
 * Shown on line item rows while an optimistic mutation is in flight (Tier 1).
 * Uses the same icon + color + label pattern as the planned badge.
 */
export function PendingBadge() {
  const { t } = useTranslation();

  return (
    <Badge
      font="normal"
      variant="outline"
      className="bg-planned-subtle h-4 px-1.5 text-[0.625rem] text-foreground"
    >
      <span className="flex items-center gap-1">
        <Icon name="repeat" size="xs" />
        {t("categories.pendingBadge")}
      </span>
    </Badge>
  );
}
