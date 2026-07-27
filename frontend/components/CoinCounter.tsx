
import {
  Icon,
  type IconName,
} from "@lina-rodrigues/cotton-candy";
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
    <div className={`flex w-full min-w-0 items-center gap-3 ${plain ? "" : "inventory-slot"}`}>
      {iconNode}
      <div className="coin-counter min-w-0 flex-1 text-left">
        <div className="text-muted-finance text-body text-[0.65rem] font-semibold uppercase tracking-wide sm:text-xs">
          {label}
        </div>
        <div
          className={`text-amount-hero-fluid ${highlight ? "text-fin-balance" : "text-foreground"}`}
        >
          {amount}
        </div>
      </div>
    </div>
  );
}
