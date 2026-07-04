import { ISO_CURRENCIES } from "./currencies-data";

export { ISO_CURRENCIES };

export const PINNED_CURRENCY_CODES = ["BRL", "USD"] as const;

export interface CurrencyOption {
  code: string;
  name: string;
  pinned?: boolean;
}

export function getCurrencyOptions(): CurrencyOption[] {
  const pinnedSet = new Set<string>(PINNED_CURRENCY_CODES);
  const pinned: CurrencyOption[] = [];
  const rest: CurrencyOption[] = [];

  for (const { code, name } of ISO_CURRENCIES) {
    const option = { code, name, pinned: pinnedSet.has(code) };
    if (pinnedSet.has(code)) {
      pinned.push(option);
    } else {
      rest.push(option);
    }
  }

  pinned.sort(
    (a, b) =>
      PINNED_CURRENCY_CODES.indexOf(a.code as (typeof PINNED_CURRENCY_CODES)[number]) -
      PINNED_CURRENCY_CODES.indexOf(b.code as (typeof PINNED_CURRENCY_CODES)[number]),
  );

  rest.sort((a, b) => a.code.localeCompare(b.code));

  return [...pinned, ...rest];
}
