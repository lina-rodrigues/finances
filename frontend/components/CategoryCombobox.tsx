"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { CategoryIcon } from "@/components/CategoryIcon";
import { type FlatCategory } from "@/lib/api";
import { useTranslation } from "@/lib/i18n";

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
  const { t } = useTranslation();
  const uncategorizedLabel = t("common.uncategorized");
  const listboxId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);

  const suggestions = useMemo(() => {
    const query = value.trim().toLowerCase();
    const showAll = query.length === 0 || query === uncategorizedLabel.toLowerCase();
    const items: Suggestion[] = [
      { label: uncategorizedLabel, icon: "category", isUncategorized: true },
    ];

    for (const cat of categories) {
      if (showAll || cat.name.toLowerCase().includes(query)) {
        items.push({ label: cat.name, icon: cat.icon, isUncategorized: false });
      }
    }

    return items;
  }, [categories, value, uncategorizedLabel]);

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

  function handleKeyDown(event: React.KeyboardEvent<HTMLElement>) {
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
    <div ref={containerRef} style={{ position: "relative" }}>
      <wa-input
        id={id}
        label={t("addItem.category")}
        data-testid="category-combobox-input"
        role="combobox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-autocomplete="list"
        value={value}
        onInput={(event) => {
          onChange((event.target as HTMLInputElement).value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        disabled={disabled || undefined}
        placeholder={t("categories.categoryName")}
        autocomplete="off"
      ></wa-input>
      {open && suggestions.length > 0 ? (
        <ul
          id={listboxId}
          data-testid="category-combobox-listbox"
          role="listbox"
          className="wa-stack wa-gap-3xs"
          style={{
            position: "absolute",
            top: "100%",
            zIndex: 60,
            marginTop: "var(--wa-space-2xs)",
            maxHeight: "12rem",
            width: "100%",
            overflowY: "auto",
            listStyle: "none",
            padding: "var(--wa-space-2xs)",
            margin: "var(--wa-space-2xs) 0 0",
            background: "var(--wa-color-surface-raised)",
            border: "1px solid var(--wa-color-surface-border)",
            boxShadow: "var(--wa-shadow-m)",
          }}
        >
          {suggestions.map((suggestion, index) => {
            const highlighted = index === highlightIndex;

            return (
              <li key={suggestion.label} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={highlighted}
                  className="wa-cluster wa-gap-s"
                  style={{
                    width: "100%",
                    justifyContent: "flex-start",
                    padding: "var(--wa-space-s)",
                    border: 0,
                    background: highlighted
                      ? "var(--wa-color-neutral-fill-quiet)"
                      : "transparent",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectSuggestion(suggestion)}
                  onMouseEnter={() => setHighlightIndex(index)}
                >
                  <CategoryIcon icon={suggestion.icon} />
                  <span>{suggestion.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
