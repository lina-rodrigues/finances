"use client";

import { CATEGORY_ICON_KEYS, resolveCategoryFaIcon } from "@/lib/categoryIcons";

interface CategoryIconPickerProps {
  value: string;
  onChange: (icon: string) => void;
  disabled?: boolean;
  label?: string;
}

export function CategoryIconPicker({
  value,
  onChange,
  disabled,
  label = "Category icon",
}: CategoryIconPickerProps) {
  return (
    <div
      className="wa-grid wa-gap-s"
      style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}
      role="listbox"
      aria-label={label}
    >
      {CATEGORY_ICON_KEYS.map((key) => {
        const selected = key === value;
        return (
          <wa-button
            key={key}
            type="button"
            appearance={selected ? "filled" : "outlined"}
            variant={selected ? "brand" : "neutral"}
            disabled={disabled || undefined}
            aria-selected={selected}
            onClick={() => onChange(key)}
          >
            <wa-icon name={resolveCategoryFaIcon(key)} label={key}></wa-icon>
          </wa-button>
        );
      })}
    </div>
  );
}
