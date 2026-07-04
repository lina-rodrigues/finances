import { Icon } from "@/components/Icon";
import type { IconName } from "@/lib/icons";

interface CoinCounterProps {
  amount: string;
  label: string;
  highlight?: boolean;
  icon?: IconName;
}

export function CoinCounter({ amount, label, highlight = false, icon }: CoinCounterProps) {
  return (
    <div className="inventory-slot flex min-w-0 items-center gap-3">
      {icon && (
        <div className="icon-slot shrink-0">
          <Icon name={icon} size="lg" />
        </div>
      )}
      <div className="min-w-0 text-left">
        <div className="text-muted-finance text-body text-[0.65rem] font-semibold uppercase tracking-wide sm:text-xs">
          {label}
        </div>
        <div
          className={`text-amount-hero text-base sm:text-lg ${highlight ? "text-balance" : "text-foreground"}`}
        >
          {amount}
        </div>
      </div>
    </div>
  );
}
