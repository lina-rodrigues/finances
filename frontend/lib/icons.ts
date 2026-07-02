import {
  faArrowTrendDown,
  faArrowTrendUp,
  faArrowDown,
  faArrowUp,
  faBolt,
  faBriefcase,
  faCar,
  faCartShopping,
  faChartPie,
  faCheck,
  faChevronDown,
  faClock,
  faDumbbell,
  faFilm,
  faFolder,
  faGift,
  faGraduationCap,
  faHeartPulse,
  faHouse,
  faMoon,
  faPen,
  faPiggyBank,
  faPlane,
  faPlus,
  faScaleBalanced,
  faShirt,
  faSun,
  faTrash,
  faUtensils,
  faWallet,
  faXmark,
  type IconDefinition,
} from "@fortawesome/free-solid-svg-icons";

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

export const iconMap: Record<IconName, IconDefinition> = {
  income: faArrowTrendUp,
  expense: faArrowTrendDown,
  planned: faClock,
  balance: faWallet,
  endingBalance: faScaleBalanced,
  category: faFolder,
  house: faHouse,
  utensils: faUtensils,
  car: faCar,
  cartShopping: faCartShopping,
  bolt: faBolt,
  heartPulse: faHeartPulse,
  graduationCap: faGraduationCap,
  plane: faPlane,
  gift: faGift,
  piggyBank: faPiggyBank,
  briefcase: faBriefcase,
  shirt: faShirt,
  film: faFilm,
  dumbbell: faDumbbell,
  add: faPlus,
  edit: faPen,
  delete: faTrash,
  save: faCheck,
  cancel: faXmark,
  arrowUp: faArrowUp,
  arrowDown: faArrowDown,
  themeLight: faSun,
  themeDark: faMoon,
  chevron: faChevronDown,
  logo: faChartPie,
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

export const iconSizeMap = {
  xs: "h-3 w-3",
  sm: "h-3.5 w-3.5",
  md: "h-4 w-4",
  lg: "h-5 w-5",
} as const;

export type IconSize = keyof typeof iconSizeMap;

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
