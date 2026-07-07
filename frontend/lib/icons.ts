import type { SVGProps, JSX } from "react";
import { ArrowDown } from "pixelarticons/react/ArrowDown";
import { ArrowUp } from "pixelarticons/react/ArrowUp";
import { Banknote } from "pixelarticons/react/Banknote";
import { Briefcase } from "pixelarticons/react/Briefcase";
import { Building } from "pixelarticons/react/Building";
import { Bus } from "pixelarticons/react/Bus";
import { Calendar } from "pixelarticons/react/Calendar";
import { Car } from "pixelarticons/react/Car";
import { Check } from "pixelarticons/react/Check";
import { ChevronDown } from "pixelarticons/react/ChevronDown";
import { ChevronLeft } from "pixelarticons/react/ChevronLeft";
import { ChevronRight } from "pixelarticons/react/ChevronRight";
import { Clock } from "pixelarticons/react/Clock";
import { Close } from "pixelarticons/react/Close";
import { CloudSun } from "pixelarticons/react/CloudSun";
import { Coffee } from "pixelarticons/react/Coffee";
import { Coins } from "pixelarticons/react/Coins";
import { Folder } from "pixelarticons/react/Folder";
import { Gift } from "pixelarticons/react/Gift";
import { Globe } from "pixelarticons/react/Globe";
import { Heart } from "pixelarticons/react/Heart";
import { Home } from "pixelarticons/react/Home";
import { InfoBox } from "pixelarticons/react/InfoBox";
import { Chart } from "pixelarticons/react/Chart";
import { Grid3x3 } from "pixelarticons/react/Grid3x3";
import { HumanArmsUp } from "pixelarticons/react/HumanArmsUp";
import { ListBox } from "pixelarticons/react/ListBox";
import { MapPin } from "pixelarticons/react/MapPin";
import { Moon } from "pixelarticons/react/Moon";
import { Music } from "pixelarticons/react/Music";
import { PenSquare } from "pixelarticons/react/PenSquare";
import { Plus } from "pixelarticons/react/Plus";
import { Reload } from "pixelarticons/react/Reload";
import { SortVertical } from "pixelarticons/react/SortVertical";
import { Shirt } from "pixelarticons/react/Shirt";
import { ShoppingCart } from "pixelarticons/react/ShoppingCart";
import { Smartphone } from "pixelarticons/react/Smartphone";
import { SquareAlert } from "pixelarticons/react/SquareAlert";
import { Trash } from "pixelarticons/react/Trash";
import { ToolCase } from "pixelarticons/react/ToolCase";
import { University } from "pixelarticons/react/University";
import { Video } from "pixelarticons/react/Video";
import { Wallet } from "pixelarticons/react/Wallet";
import { Wifi } from "pixelarticons/react/Wifi";
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
  | "building"
  | "utensils"
  | "car"
  | "bus"
  | "cartShopping"
  | "bolt"
  | "wifi"
  | "heartPulse"
  | "graduationCap"
  | "plane"
  | "globe"
  | "gift"
  | "piggyBank"
  | "banknote"
  | "briefcase"
  | "shirt"
  | "film"
  | "music"
  | "dumbbell"
  | "smartphone"
  | "calendar"
  | "add"
  | "edit"
  | "delete"
  | "save"
  | "cancel"
  | "arrowUp"
  | "arrowDown"
  | "themeLight"
  | "themeDark"
  | "chevronLeft"
  | "chevronRight"
  | "chevronDown"
  | "alert"
  | "info"
  | "settings"
  | "navFinance"
  | "navCategories"
  | "navReports"
  | "repeat"
  | "dragHandle";

export const iconMap: Record<IconName, PixelIcon> = {
  income: WavesArrowUp,
  expense: WavesArrowDown,
  planned: Clock,
  balance: Wallet,
  endingBalance: Coins,
  category: Folder,
  house: Home,
  building: Building,
  utensils: Coffee,
  car: Car,
  bus: Bus,
  cartShopping: ShoppingCart,
  bolt: ZapIcon,
  wifi: Wifi,
  heartPulse: Heart,
  graduationCap: University,
  plane: MapPin,
  globe: Globe,
  gift: Gift,
  piggyBank: Coins,
  banknote: Banknote,
  briefcase: Briefcase,
  shirt: Shirt,
  film: Video,
  music: Music,
  dumbbell: HumanArmsUp,
  smartphone: Smartphone,
  calendar: Calendar,
  add: Plus,
  edit: PenSquare,
  delete: Trash,
  save: Check,
  cancel: Close,
  arrowUp: ArrowUp,
  arrowDown: ArrowDown,
  themeLight: CloudSun,
  themeDark: Moon,
  chevronLeft: ChevronLeft,
  chevronRight: ChevronRight,
  chevronDown: ChevronDown,
  alert: SquareAlert,
  info: InfoBox,
  settings: ToolCase,
  navFinance: ListBox,
  navCategories: Grid3x3,
  navReports: Chart,
  repeat: Reload,
  dragHandle: SortVertical,
};

export const iconColorMap: Record<IconName, string> = {
  income: "text-income",
  expense: "text-expense",
  planned: "text-planned",
  balance: "text-fin-balance",
  endingBalance: "text-fin-balance",
  /* Category icons use neutral color when rendered via CategoryIcon. */
  category: "text-muted-finance",
  house: "text-muted-finance",
  building: "text-muted-finance",
  utensils: "text-muted-finance",
  car: "text-muted-finance",
  bus: "text-muted-finance",
  cartShopping: "text-muted-finance",
  bolt: "text-muted-finance",
  wifi: "text-muted-finance",
  heartPulse: "text-muted-finance",
  graduationCap: "text-muted-finance",
  plane: "text-muted-finance",
  globe: "text-muted-finance",
  gift: "text-muted-finance",
  piggyBank: "text-muted-finance",
  banknote: "text-muted-finance",
  briefcase: "text-muted-finance",
  shirt: "text-muted-finance",
  film: "text-muted-finance",
  music: "text-muted-finance",
  dumbbell: "text-muted-finance",
  smartphone: "text-muted-finance",
  calendar: "text-muted-finance",
  add: "text-link",
  edit: "text-muted-foreground",
  delete: "text-expense",
  save: "text-link",
  cancel: "text-muted-foreground",
  arrowUp: "text-muted-foreground",
  arrowDown: "text-muted-foreground",
  themeLight: "text-fin-balance",
  themeDark: "text-fin-balance",
  chevronLeft: "text-muted-finance",
  chevronRight: "text-muted-finance",
  chevronDown: "text-muted-finance",
  alert: "text-expense",
  info: "text-planned",
  settings: "text-muted-finance",
  navFinance: "text-muted-finance",
  navCategories: "text-muted-finance",
  navReports: "text-muted-finance",
  repeat: "text-link",
  dragHandle: "text-muted-finance",
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
  "building",
  "utensils",
  "car",
  "bus",
  "cartShopping",
  "bolt",
  "wifi",
  "heartPulse",
  "graduationCap",
  "plane",
  "globe",
  "gift",
  "piggyBank",
  "banknote",
  "briefcase",
  "shirt",
  "film",
  "music",
  "dumbbell",
  "smartphone",
  "calendar",
];

/** Neutral color for category icons in headers, pickers, and lists. */
export const categoryIconColorClass = "text-muted-finance";

export function resolveCategoryIcon(icon: string | undefined): IconName {
  if (icon && icon in iconMap && categoryIcons.includes(icon as IconName)) {
    return icon as IconName;
  }
  return "category";
}

export function formatIconLabel(name: IconName): string {
  return name.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());
}
