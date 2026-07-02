import type { SVGProps, JSX } from "react";
import { ArrowDown } from "pixelarticons/react/ArrowDown";
import { ArrowUp } from "pixelarticons/react/ArrowUp";
import { Briefcase } from "pixelarticons/react/Briefcase";
import { Car } from "pixelarticons/react/Car";
import { Check } from "pixelarticons/react/Check";
import { ChevronDown } from "pixelarticons/react/ChevronDown";
import { Clock } from "pixelarticons/react/Clock";
import { Close } from "pixelarticons/react/Close";
import { CloudSun } from "pixelarticons/react/CloudSun";
import { Coffee } from "pixelarticons/react/Coffee";
import { Coins } from "pixelarticons/react/Coins";
import { Folder } from "pixelarticons/react/Folder";
import { Gift } from "pixelarticons/react/Gift";
import { Heart } from "pixelarticons/react/Heart";
import { Home } from "pixelarticons/react/Home";
import { HumanArmsUp } from "pixelarticons/react/HumanArmsUp";
import { MapPin } from "pixelarticons/react/MapPin";
import { Moon } from "pixelarticons/react/Moon";
import { PenSquare } from "pixelarticons/react/PenSquare";
import { Plus } from "pixelarticons/react/Plus";
import { Scale } from "pixelarticons/react/Scale";
import { Shirt } from "pixelarticons/react/Shirt";
import { ShoppingCart } from "pixelarticons/react/ShoppingCart";
import { Trash } from "pixelarticons/react/Trash";
import { University } from "pixelarticons/react/University";
import { Video } from "pixelarticons/react/Video";
import { Wallet } from "pixelarticons/react/Wallet";
import { WavesArrowDown } from "pixelarticons/react/WavesArrowDown";
import { WavesArrowUp } from "pixelarticons/react/WavesArrowUp";
import { Zap as ZapIcon } from "pixelarticons/react/Zap";

export type PixelIcon = (props: SVGProps<SVGSVGElement>) => JSX.Element;

export type IconName =
  | "income"
  | "expense"
  | "planned"
  | "balance"
  | "endingBalance"
  | "category"
  | "house"
  | "utensils"
  | "car"
  | "cartShopping"
  | "bolt"
  | "heartPulse"
  | "graduationCap"
  | "plane"
  | "gift"
  | "piggyBank"
  | "briefcase"
  | "shirt"
  | "film"
  | "dumbbell"
  | "add"
  | "edit"
  | "delete"
  | "save"
  | "cancel"
  | "arrowUp"
  | "arrowDown"
  | "themeLight"
  | "themeDark"
  | "chevron"
  | "logo";

export const iconMap: Record<IconName, PixelIcon> = {
  income: WavesArrowUp,
  expense: WavesArrowDown,
  planned: Clock,
  balance: Wallet,
  endingBalance: Scale,
  category: Folder,
  house: Home,
  utensils: Coffee,
  car: Car,
  cartShopping: ShoppingCart,
  bolt: ZapIcon,
  heartPulse: Heart,
  graduationCap: University,
  plane: MapPin,
  gift: Gift,
  piggyBank: Coins,
  briefcase: Briefcase,
  shirt: Shirt,
  film: Video,
  dumbbell: HumanArmsUp,
  add: Plus,
  edit: PenSquare,
  delete: Trash,
  save: Check,
  cancel: Close,
  arrowUp: ArrowUp,
  arrowDown: ArrowDown,
  themeLight: CloudSun,
  themeDark: Moon,
  chevron: ChevronDown,
  logo: Coins,
};

export const iconColorMap: Record<IconName, string> = {
  income: "text-income",
  expense: "text-expense",
  planned: "text-planned",
  balance: "text-balance",
  endingBalance: "text-balance",
  category: "text-muted-finance",
  house: "text-primary",
  utensils: "text-warning",
  car: "text-info",
  cartShopping: "text-success",
  bolt: "text-warning",
  heartPulse: "text-error",
  graduationCap: "text-primary",
  plane: "text-info",
  gift: "text-secondary",
  piggyBank: "text-success",
  briefcase: "text-primary",
  shirt: "text-accent",
  film: "text-secondary",
  dumbbell: "text-success",
  add: "text-primary",
  edit: "text-base-content/70",
  delete: "text-error",
  save: "text-primary",
  cancel: "text-base-content/70",
  arrowUp: "text-base-content/70",
  arrowDown: "text-base-content/70",
  themeLight: "text-warning",
  themeDark: "text-info",
  chevron: "text-muted-finance",
  logo: "text-primary",
};

/** Pixel-friendly sizes (multiples of 12; lg uses 24 for crisp rendering). */
export const iconSizePx = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
} as const;

export type IconSize = keyof typeof iconSizePx;

/** Icons available in the category picker (matches API allowed list). */
export const categoryIcons: IconName[] = [
  "category",
  "income",
  "house",
  "utensils",
  "car",
  "cartShopping",
  "bolt",
  "heartPulse",
  "graduationCap",
  "plane",
  "gift",
  "piggyBank",
  "briefcase",
  "shirt",
  "film",
  "dumbbell",
];

export function resolveCategoryIcon(icon: string | undefined): IconName {
  if (icon && icon in iconMap && categoryIcons.includes(icon as IconName)) {
    return icon as IconName;
  }
  return "category";
}

export function formatIconLabel(name: IconName): string {
  return name.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());
}
