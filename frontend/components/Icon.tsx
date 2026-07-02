"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { iconColorMap, iconMap, iconSizeMap, type IconName, type IconSize } from "@/lib/icons";

interface IconProps {
  name: IconName;
  size?: IconSize;
  className?: string;
  label?: string;
  /** Override the default semantic icon color */
  colorClass?: string;
}

export function Icon({ name, size = "sm", className = "", label, colorClass }: IconProps) {
  const resolvedColor = colorClass ?? iconColorMap[name];
  const sizeClass = iconSizeMap[size];

  return (
    <FontAwesomeIcon
      icon={iconMap[name]}
      className={`${sizeClass} ${resolvedColor} ${className}`.trim()}
      aria-hidden={label ? undefined : true}
      aria-label={label}
    />
  );
}
