"use client";

import { resolveCategoryFaIcon } from "@/lib/categoryIcons";

interface CategoryIconProps {
  icon: string;
  label?: string;
  className?: string;
}

export function CategoryIcon({ icon, label, className }: CategoryIconProps) {
  return (
    <wa-icon
      name={resolveCategoryFaIcon(icon)}
      label={label}
      className={className}
    ></wa-icon>
  );
}
