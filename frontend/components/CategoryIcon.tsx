"use client";

import {
  Icon,
  categoryIconColorClass,
  resolveCategoryIcon,
  type IconName,
  type IconSize,
} from "@lina-rodrigues/cotton-candy";
interface CategoryIconProps {
  icon: string | IconName | undefined;
  size?: IconSize;
  className?: string;
  label?: string;
}

export function CategoryIcon({ icon, size = "sm", className = "", label }: CategoryIconProps) {
  const name = typeof icon === "string" ? resolveCategoryIcon(icon) : resolveCategoryIcon(icon);

  return (
    <Icon
      name={name}
      size={size}
      className={className}
      label={label}
      colorClass={categoryIconColorClass}
    />
  );
}
