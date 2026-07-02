"use client";

import { config } from "@fortawesome/fontawesome-svg-core";
import "@fortawesome/fontawesome-svg-core/styles.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { iconColorMap, iconMap, iconSizeMap, type IconName, type IconSize } from "@/lib/icons";

config.autoAddCss = false;

interface IconProps {
  name: IconName;
  size?: IconSize;
  className?: string;
  label?: string;
  /** Override the default semantic icon color */
  colorClass?: string;
}

export function Icon({ name, size = "sm", className = "", label, colorClass }: IconProps) {
  const icon = iconMap[name];
  const resolvedColor = colorClass ?? iconColorMap[name];
  const sizeClass = iconSizeMap[size];

  if (!icon) {
    return null;
  }

  return (
    <FontAwesomeIcon
      icon={icon}
      className={`${sizeClass} ${resolvedColor} ${className}`.trim()}
      aria-hidden={label ? undefined : true}
      aria-label={label}
    />
  );
}
