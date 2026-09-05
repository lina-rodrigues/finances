import type { AppLanguage } from "../models/User.js";

export interface MonthWorkbookLabels {
  title: string;
  period: string;
  generated: string;
  currency: string;
  openingBalance: string;
  realizedIncome: string;
  realizedExpenses: string;
  net: string;
  closingRealized: string;
  projectedClosing: string;
  realizedLineItems: string;
  stillPlanned: string;
  categories: string;
  movements: string;
  noCategories: string;
  noMovements: string;
  category: string;
  type: string;
  classification: string;
  planned: string;
  realized: string;
  variance: string;
  status: string;
  lineItemCount: string;
  date: string;
  lineItem: string;
  note: string;
  amount: string;
  recurring: string;
  total: string;
  income: string;
  expense: string;
  uncategorized: string;
  essential: string;
  nonEssential: string;
  investment: string;
  statusRealized: string;
  statusPartial: string;
  statusUnrealized: string;
  yes: string;
  no: string;
  emDash: string;
}

const EN: MonthWorkbookLabels = {
  title: "Month report",
  period: "Period",
  generated: "Generated",
  currency: "Currency",
  openingBalance: "Opening balance",
  realizedIncome: "Realized income",
  realizedExpenses: "Realized expenses",
  net: "Net",
  closingRealized: "Closing realized balance",
  projectedClosing: "Projected closing (includes unrealized planned amounts)",
  realizedLineItems: "Realized line items",
  stillPlanned: "Still planned (no entries)",
  categories: "Categories",
  movements: "Movements",
  noCategories: "No categories with line items this month.",
  noMovements: "No realized movements this month.",
  category: "Category",
  type: "Type",
  classification: "Classification",
  planned: "Planned",
  realized: "Realized",
  variance: "Variance",
  status: "Status",
  lineItemCount: "Line items",
  date: "Date",
  lineItem: "Line item",
  note: "Note",
  amount: "Amount",
  recurring: "Recurring",
  total: "Total",
  income: "Income",
  expense: "Expense",
  uncategorized: "Uncategorized",
  essential: "Essential",
  nonEssential: "Non-essential",
  investment: "Investment",
  statusRealized: "Realized",
  statusPartial: "Partial",
  statusUnrealized: "Unrealized",
  yes: "Yes",
  no: "No",
  emDash: "—",
};

const PT: MonthWorkbookLabels = {
  title: "Relatório mensal",
  period: "Período",
  generated: "Gerado em",
  currency: "Moeda",
  openingBalance: "Saldo inicial",
  realizedIncome: "Receitas realizadas",
  realizedExpenses: "Despesas realizadas",
  net: "Resultado",
  closingRealized: "Saldo realizado final",
  projectedClosing: "Saldo projetado (inclui valores planejados não realizados)",
  realizedLineItems: "Itens realizados",
  stillPlanned: "Ainda planejados (sem lançamentos)",
  categories: "Categorias",
  movements: "Movimentações",
  noCategories: "Nenhuma categoria com itens neste mês.",
  noMovements: "Nenhuma movimentação realizada neste mês.",
  category: "Categoria",
  type: "Tipo",
  classification: "Classificação",
  planned: "Planejado",
  realized: "Realizado",
  variance: "Variação",
  status: "Status",
  lineItemCount: "Itens",
  date: "Data",
  lineItem: "Item",
  note: "Observação",
  amount: "Valor",
  recurring: "Recorrente",
  total: "Total",
  income: "Receita",
  expense: "Despesa",
  uncategorized: "Sem categoria",
  essential: "Essencial",
  nonEssential: "Não essencial",
  investment: "Investimento",
  statusRealized: "Realizado",
  statusPartial: "Parcial",
  statusUnrealized: "Não realizado",
  yes: "Sim",
  no: "Não",
  emDash: "—",
};

export function getMonthWorkbookLabels(language: AppLanguage): MonthWorkbookLabels {
  return language === "pt" ? PT : EN;
}

export function monthWorkbookFilename(yearMonth: string, language: AppLanguage): string {
  const base = language === "pt" ? "financas" : "finance";
  return `${base}-${yearMonth}.xlsx`;
}
