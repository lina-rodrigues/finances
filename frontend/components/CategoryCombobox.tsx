"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { Input } from "@/components/ui/pixelact-ui/input";
import { type FlatCategory } from "@/lib/api";
import { resolveCategoryIcon } from "@/lib/icons";

export const UNCATEGORIZED_LABEL = "Uncategorized";

interface CategoryComboboxProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  categories: FlatCategory[];
  disabled?: boolean;
}

interface Suggestion {
  label: string;
  icon: string;
  isUncategorized: boolean;
}

export function CategoryCombobox({
  id,
  value,
  onChange,
  categories,
  disabled = false,
}: CategoryComboboxProps) {
  const listboxId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);

  const suggestions = useMemo(() => {
    const query = value.trim().toLowerCase();
    const showAll =
      query.length === 0 || query === UNCATEGORIZED_LABEL.toLowerCase();
    const items: Suggestion[] = [
      { label: UNCATEGORIZED_LABEL, icon: "category", isUncategorized: true },
    ];

    for (const cat of categories) {
      if (showAll || cat.name.toLowerCase().includes(query)) {
        items.push({ label: cat.name, icon: cat.icon, isUncategorized: false });
      }
    }

    return items;
  }, [categories, value]);

  useEffect(() => {
    setHighlightIndex(0);
  }, [suggestions.length, value]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  function selectSuggestion(suggestion: Suggestion) {
    onChange(suggestion.label);
    setOpen(false);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!open && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      setOpen(true);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlightIndex((index) => Math.min(index + 1, suggestions.length - 1));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightIndex((index) => Math.max(index - 1, 0));
      return;
    }

    if (event.key === "Enter" && open && suggestions[highlightIndex]) {
      event.preventDefault();
      selectSuggestion(suggestions[highlightIndex]);
      return;
    }

    if (event.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="space-y-1">
      <label htmlFor={id} className="text-body text-sm font-semibold">
        Category
      </label>
      <div className="finance-dialog-field relative">
        <Input
          id={id}
          data-testid="category-combobox-input"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder="Category name"
          autoComplete="off"
        />
        {open && suggestions.length > 0 && (
          <ul
            id={listboxId}
            data-testid="category-combobox-listbox"
            role="listbox"
            className="absolute top-full z-[60] mt-1 max-h-48 w-full overflow-y-auto border bg-background shadow-(--pixel-box-shadow)"
          >
          {suggestions.map((suggestion, index) => {
            const iconName = resolveCategoryIcon(suggestion.icon);
            const highlighted = index === highlightIndex;

            return (
              <li key={suggestion.label} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={highlighted}
                  className={`interactive-row flex w-full items-center gap-2 px-3 py-2 text-left ${
                    highlighted ? "bg-muted" : ""
                  }`}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectSuggestion(suggestion)}
                  onMouseEnter={() => setHighlightIndex(index)}
                >
                  <Icon name={iconName} size="sm" />
                  <span className="text-body text-sm">{suggestion.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
        )}
      </div>
    </div>
  );
}
