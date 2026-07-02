import {
  faArrowTrendDown,
  faArrowTrendUp,
  faChartPie,
  faCheck,
  faChevronDown,
  faClock,
  faFolder,
  faMoon,
  faPen,
  faPlus,
  faScaleBalanced,
  faSun,
  faTrash,
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
  | "add"
  | "edit"
  | "delete"
  | "save"
  | "cancel"
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
  add: faPlus,
  edit: faPen,
  delete: faTrash,
  save: faCheck,
  cancel: faXmark,
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
  add: "text-primary",
  edit: "text-base-content/70",
  delete: "text-error",
  save: "text-primary",
  cancel: "text-base-content/70",
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
