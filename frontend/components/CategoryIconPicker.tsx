"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CategoryIcon } from "@/components/CategoryIcon";
import { categoryIcons, formatIconLabel, type IconName } from "@/lib/icons";
import { useTranslation } from "@/lib/i18n";

import {
  Button,
} from "@lina-rodrigues/cotton-candy";
interface CategoryIconPickerProps {
  value: IconName;
  onChange: (icon: IconName) => void;
  disabled?: boolean;
  label?: string;
}

export function CategoryIconPicker({
  value,
  onChange,
  disabled = false,
  label,
}: CategoryIconPickerProps) {
  const { t } = useTranslation();
  const listboxId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const resolvedLabel = label ?? t("categories.pickIcon");

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  function selectIcon(icon: IconName) {
    onChange(icon);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative shrink-0">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="pressable focus-ring h-9 w-9 p-0"
        aria-label={resolvedLabel}
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
      >
        <CategoryIcon icon={value} size="sm" />
      </Button>
      {open && (
        <div
          id={listboxId}
          role="listbox"
          aria-label={resolvedLabel}
          className="absolute top-full z-[60] mt-1 w-52 border bg-background p-2 shadow-(--pixel-box-shadow)"
        >
          <div className="category-icon-picker-grid">
            {categoryIcons.map((icon) => {
              const selected = icon === value;
              return (
                <button
                  key={icon}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  aria-label={formatIconLabel(icon)}
                  className={`category-icon-picker-cell interactive-row pressable focus-ring ${
                    selected ? "category-icon-picker-cell-selected" : ""
                  }`}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectIcon(icon)}
                >
                  <CategoryIcon icon={icon} size="sm" />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
