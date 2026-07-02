"use client";

import { iconColorMap, iconMap, iconSizePx, type IconName, type IconSize } from "@/lib/icons";

interface IconProps {
  name: IconName;
  size?: IconSize;
  className?: string;
  label?: string;
  /** Override the default semantic icon color */
  colorClass?: string;
}

export function Icon({ name, size = "sm", className = "", label, colorClass }: IconProps) {
  const Component = iconMap[name];
  const resolvedColor = colorClass ?? iconColorMap[name];
  const px = iconSizePx[size];

  if (!Component) {
    return null;
  }

  return (
    <Component
      width={px}
      height={px}
      className={`shrink-0 ${resolvedColor} ${className}`.trim()}
      aria-hidden={label ? undefined : true}
      aria-label={label}
    />
  );
}
