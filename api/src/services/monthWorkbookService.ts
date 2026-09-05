import ExcelJS from "exceljs";
import type { BudgetGroup } from "../constants/budgetGroup.js";
import { resolveBudgetGroup } from "../constants/budgetGroup.js";
import type { AppLanguage } from "../models/User.js";
import type { LineItemType } from "../models/LineItem.js";
import type { CategoryWithLineItems, LineItemResponse } from "./categoryService.js";
import type { MonthWorkbookLabels } from "./monthWorkbookLabels.js";
import { getMonthWorkbookLabels, monthWorkbookFilename } from "./monthWorkbookLabels.js";

export { monthWorkbookFilename };

export interface MonthWorkbookView {
  month: {
    yearMonth: string;
    lastMonthBalance: number;
    expectedBalance: number;
    currentRealizedBalance: number;
  };
  categories: CategoryWithLineItems[];
  uncategorized: LineItemResponse[];
}

export interface BuildMonthWorkbookInput {
  monthView: MonthWorkbookView;
  language: AppLanguage;
  currency: string;
  generatedAt?: Date;
}

interface CategoryRollupRow {
  category: string;
  type: LineItemType;
  budgetGroup: BudgetGroup | null;
  planned: number;
  realized: number;
  variance: number;
  status: "realized" | "partial" | "unrealized";
  lineItemCount: number;
}

interface MovementRow {
  date: Date;
  type: LineItemType;
  category: string;
  label: string;
  note: string | null;
  amount: number;
  recurring: boolean;
}

function moneyFormat(currency: string): string {
  switch (currency) {
    case "BRL":
      return '"R$"#,##0.00';
    case "USD":
      return '"$"#,##0.00';
    case "EUR":
      return '"€"#,##0.00';
    default:
      return `"${currency} "#,##0.00`;
  }
}

function dateFormat(language: AppLanguage): string {
  return language === "pt" ? "dd/mm/yyyy" : "yyyy-mm-dd";
}

function dateTimeFormat(language: AppLanguage): string {
  return language === "pt" ? "dd/mm/yyyy hh:mm" : "yyyy-mm-dd hh:mm";
}

function typeLabel(type: LineItemType, labels: MonthWorkbookLabels): string {
  return type === "income" ? labels.income : labels.expense;
}

function classificationLabel(
  type: LineItemType,
  budgetGroup: BudgetGroup | null,
  labels: MonthWorkbookLabels,
): string {
  if (type === "income") {
    return labels.emDash;
  }
  switch (resolveBudgetGroup(budgetGroup)) {
    case "essential":
      return labels.essential;
    case "non_essential":
      return labels.nonEssential;
    case "investment":
      return labels.investment;
  }
}

function statusLabel(
  status: CategoryRollupRow["status"],
  labels: MonthWorkbookLabels,
): string {
  if (status === "realized") {
    return labels.statusRealized;
  }
  if (status === "partial") {
    return labels.statusPartial;
  }
  return labels.statusUnrealized;
}

function rollupItems(items: LineItemResponse[]): Omit<CategoryRollupRow, "category" | "type" | "budgetGroup"> | null {
  if (items.length === 0) {
    return null;
  }

  const planned = items.reduce((sum, item) => sum + item.plannedAmount, 0);
  const realized = items.reduce((sum, item) => sum + (item.realizedAmount ?? 0), 0);
  const realizedCount = items.filter((item) => item.isRealized).length;
  const status: CategoryRollupRow["status"] =
    realizedCount === 0 ? "unrealized" : realizedCount === items.length ? "realized" : "partial";

  return {
    planned,
    realized,
    variance: planned - realized,
    status,
    lineItemCount: items.length,
  };
}

function collectCategoryRows(
  categories: CategoryWithLineItems[],
  uncategorized: LineItemResponse[],
  labels: MonthWorkbookLabels,
): CategoryRollupRow[] {
  const rows: CategoryRollupRow[] = [];

  for (const category of categories) {
    for (const type of ["income", "expense"] as const) {
      const items = category.lineItems.filter((item) => item.type === type);
      const rollup = rollupItems(items);
      if (!rollup) {
        continue;
      }
      rows.push({
        category: category.name,
        type,
        budgetGroup: type === "expense" ? category.budgetGroup : null,
        ...rollup,
      });
    }
  }

  for (const type of ["income", "expense"] as const) {
    const items = uncategorized.filter((item) => item.type === type);
    const rollup = rollupItems(items);
    if (!rollup) {
      continue;
    }
    rows.push({
      category: labels.uncategorized,
      type,
      budgetGroup: null,
      ...rollup,
    });
  }

  return rows;
}

function collectMovements(
  categories: CategoryWithLineItems[],
  uncategorized: LineItemResponse[],
  labels: MonthWorkbookLabels,
): MovementRow[] {
  const groups: { category: string; items: LineItemResponse[] }[] = [
    ...categories.map((category) => ({ category: category.name, items: category.lineItems })),
    { category: labels.uncategorized, items: uncategorized },
  ];

  const rows: MovementRow[] = [];
  for (const group of groups) {
    for (const item of group.items) {
      for (const entry of item.entries) {
        rows.push({
          date: new Date(entry.createdAt),
          type: item.type,
          category: group.category,
          label: item.label,
          note: entry.note,
          amount: entry.amount,
          recurring: item.seriesId != null,
        });
      }
    }
  }

  rows.sort((a, b) => {
    const byDate = a.date.getTime() - b.date.getTime();
    if (byDate !== 0) {
      return byDate;
    }
    const byCategory = a.category.localeCompare(b.category);
    if (byCategory !== 0) {
      return byCategory;
    }
    return a.label.localeCompare(b.label);
  });

  return rows;
}

function allLineItems(monthView: MonthWorkbookView): LineItemResponse[] {
  return [
    ...monthView.categories.flatMap((category) => category.lineItems),
    ...monthView.uncategorized,
  ];
}

function writeLabelValue(
  sheet: ExcelJS.Worksheet,
  row: number,
  label: string,
  value: ExcelJS.CellValue,
): void {
  const labelCell = sheet.getCell(row, 1);
  labelCell.value = label;
  labelCell.font = { bold: true };
  sheet.getCell(row, 2).value = value;
}

function applyMoneyFormat(sheet: ExcelJS.Worksheet, row: number, col: number, format: string): void {
  sheet.getCell(row, col).numFmt = format;
}

function applyColumnWidths(sheet: ExcelJS.Worksheet): void {
  sheet.columns = [
    { width: 22 },
    { width: 16 },
    { width: 24 },
    { width: 28 },
    { width: 18 },
    { width: 16 },
    { width: 14 },
    { width: 14 },
  ];
}

export async function buildMonthWorkbook(input: BuildMonthWorkbookInput): Promise<Buffer> {
  const generatedAt = input.generatedAt ?? new Date();
  const labels = getMonthWorkbookLabels(input.language);
  const { monthView } = input;
  const yearMonth = monthView.month.yearMonth;
  const items = allLineItems(monthView);
  const categoryRows = collectCategoryRows(monthView.categories, monthView.uncategorized, labels);
  const movements = collectMovements(monthView.categories, monthView.uncategorized, labels);

  const realizedIncome = items
    .filter((item) => item.type === "income" && item.realizedAmount != null)
    .reduce((sum, item) => sum + (item.realizedAmount ?? 0), 0);
  const realizedExpenses = items
    .filter((item) => item.type === "expense" && item.realizedAmount != null)
    .reduce((sum, item) => sum + (item.realizedAmount ?? 0), 0);
  const realizedCount = items.filter((item) => item.isRealized).length;
  const stillPlannedCount = items.length - realizedCount;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Finance";
  workbook.created = generatedAt;

  const sheet = workbook.addWorksheet(yearMonth);
  applyColumnWidths(sheet);

  const moneyFmt = moneyFormat(input.currency);
  const dateFmt = dateFormat(input.language);
  const dateTimeFmt = dateTimeFormat(input.language);

  let row = 1;
  const titleCell = sheet.getCell(row, 1);
  titleCell.value = labels.title;
  titleCell.font = { bold: true, size: 16 };
  row += 1;

  writeLabelValue(sheet, row, labels.period, yearMonth);
  row += 1;
  writeLabelValue(sheet, row, labels.generated, generatedAt);
  sheet.getCell(row, 2).numFmt = dateTimeFmt;
  row += 1;
  writeLabelValue(sheet, row, labels.currency, input.currency);
  row += 2;

  writeLabelValue(sheet, row, labels.openingBalance, monthView.month.lastMonthBalance);
  applyMoneyFormat(sheet, row, 2, moneyFmt);
  row += 1;
  writeLabelValue(sheet, row, labels.realizedIncome, realizedIncome);
  applyMoneyFormat(sheet, row, 2, moneyFmt);
  row += 1;
  writeLabelValue(sheet, row, labels.realizedExpenses, realizedExpenses);
  applyMoneyFormat(sheet, row, 2, moneyFmt);
  row += 1;
  writeLabelValue(sheet, row, labels.net, realizedIncome - realizedExpenses);
  applyMoneyFormat(sheet, row, 2, moneyFmt);
  row += 1;
  writeLabelValue(sheet, row, labels.closingRealized, monthView.month.currentRealizedBalance);
  applyMoneyFormat(sheet, row, 2, moneyFmt);
  row += 1;
  writeLabelValue(sheet, row, labels.projectedClosing, monthView.month.expectedBalance);
  applyMoneyFormat(sheet, row, 2, moneyFmt);
  row += 1;
  writeLabelValue(sheet, row, labels.realizedLineItems, realizedCount);
  row += 1;
  writeLabelValue(sheet, row, labels.stillPlanned, stillPlannedCount);

  const lastSummaryRow = row;
  row += 2;

  const sectionFont = { bold: true, size: 13 };
  const categoriesTitle = sheet.getCell(row, 1);
  categoriesTitle.value = labels.categories;
  categoriesTitle.font = sectionFont;
  row += 1;

  if (categoryRows.length === 0) {
    sheet.getCell(row, 1).value = labels.noCategories;
    row += 1;
  } else {
    const tableStart = row;

    sheet.addTable({
      name: "CategoryTotals",
      ref: `A${tableStart}`,
      headerRow: true,
      totalsRow: true,
      style: { theme: "TableStyleMedium2", showRowStripes: true },
      columns: [
        { name: labels.category, totalsRowLabel: labels.total, filterButton: true },
        { name: labels.type, filterButton: true },
        { name: labels.classification, filterButton: true },
        { name: labels.planned, totalsRowFunction: "sum", filterButton: true },
        { name: labels.realized, totalsRowFunction: "sum", filterButton: true },
        { name: labels.variance, totalsRowFunction: "sum", filterButton: true },
        { name: labels.status, filterButton: true },
        { name: labels.lineItemCount, totalsRowFunction: "sum", filterButton: true },
      ],
      rows: categoryRows.map((item) => [
        item.category,
        typeLabel(item.type, labels),
        classificationLabel(item.type, item.budgetGroup, labels),
        item.planned,
        item.realized,
        item.variance,
        statusLabel(item.status, labels),
        item.lineItemCount,
      ]),
    });

    const firstDataRow = tableStart + 1;
    const lastDataRow = tableStart + categoryRows.length;
    const totalsRow = lastDataRow + 1;
    for (const moneyCol of [4, 5, 6]) {
      for (let r = firstDataRow; r <= totalsRow; r += 1) {
        applyMoneyFormat(sheet, r, moneyCol, moneyFmt);
      }
    }
    row = totalsRow + 1;
  }

  row += 1;
  const movementsTitle = sheet.getCell(row, 1);
  movementsTitle.value = labels.movements;
  movementsTitle.font = sectionFont;
  row += 1;

  if (movements.length === 0) {
    sheet.getCell(row, 1).value = labels.noMovements;
  } else {
    const tableStart = row;
    sheet.addTable({
      name: "MonthMovements",
      ref: `A${tableStart}`,
      headerRow: true,
      totalsRow: false,
      style: { theme: "TableStyleMedium9", showRowStripes: true },
      columns: [
        { name: labels.date, filterButton: true },
        { name: labels.type, filterButton: true },
        { name: labels.category, filterButton: true },
        { name: labels.lineItem, filterButton: true },
        { name: labels.note, filterButton: true },
        { name: labels.amount, filterButton: true },
        { name: labels.recurring, filterButton: true },
      ],
      rows: movements.map((item) => [
        item.date,
        typeLabel(item.type, labels),
        item.category,
        item.label,
        item.note,
        item.amount,
        item.recurring ? labels.yes : labels.no,
      ]),
    });

    const firstDataRow = tableStart + 1;
    const lastDataRow = tableStart + movements.length;
    for (let r = firstDataRow; r <= lastDataRow; r += 1) {
      sheet.getCell(r, 1).numFmt = dateFmt;
      applyMoneyFormat(sheet, r, 6, moneyFmt);
    }
  }

  sheet.views = [{ state: "frozen", ySplit: lastSummaryRow, activeCell: "A1", showGridLines: true }];

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
