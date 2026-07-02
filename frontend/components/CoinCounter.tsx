import Image from "next/image";

interface CoinCounterProps {
  amount: string;
  label: string;
  highlight?: boolean;
}

export function CoinCounter({ amount, label, highlight = false }: CoinCounterProps) {
  return (
    <div className="inventory-slot flex items-center justify-between gap-3">
      <div>
        <div className="text-muted-finance text-body text-xs font-semibold uppercase tracking-wide">
          {label}
        </div>
        <div
          className={`text-amount-hero text-lg ${highlight ? "text-balance" : "text-foreground"}`}
        >
          {amount}
        </div>
      </div>
      <Image
        src="/assets/coin.svg"
        alt=""
        width={28}
        height={28}
        className="shrink-0"
        aria-hidden
      />
    </div>
  );
}
