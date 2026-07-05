import { Icon } from "@/components/Icon";
import type { IconName } from "@/lib/icons";

interface CoinCounterProps {
  amount: string;
  label: string;
  highlight?: boolean;
  icon?: IconName;
  /** No pixel slot chrome — for dashboard balance rows */
  plain?: boolean;
}

export function CoinCounter({
  amount,
  label,
  highlight = false,
  icon,
  plain = false,
}: CoinCounterProps) {
  const iconNode =
    icon &&
    (plain ? (
      <Icon name={icon} size="lg" className="shrink-0" />
    ) : (
      <div className="icon-slot shrink-0">
        <Icon name={icon} size="lg" />
      </div>
    ));

  return (
    <div className={`flex min-w-0 items-center gap-3 ${plain ? "" : "inventory-slot"}`}>
      {iconNode}
      <div className="min-w-0 text-left">
        <div className="text-muted-finance text-body text-[0.65rem] font-semibold uppercase tracking-wide sm:text-xs">
          {label}
        </div>
        <div
          className={`text-amount-hero break-words text-base sm:text-lg ${highlight ? "text-fin-balance" : "text-foreground"}`}
        >
          {amount}
        </div>
      </div>
    </div>
  );
}
