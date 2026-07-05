"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import type { Category, FlatCategory, LineItem, MonthView } from "@/lib/api";
import { recomputeEndingBalance } from "@/lib/monthViewMath";

export type MonthViewState = MonthView & { flatCategories: FlatCategory[] };

type LineItemLocation =
  | { kind: "category"; categoryIndex: number; itemIndex: number }
  | { kind: "uncategorized"; itemIndex: number };

type MonthViewAction =
  | { type: "SET_FROM_SERVER"; payload: MonthViewState }
  | { type: "SET_PENDING"; id: string; pending: boolean }
  | { type: "ADD_LINE_ITEM"; categoryId: string | null; item: LineItem }
  | { type: "REMOVE_LINE_ITEM"; itemId: string }
  | { type: "REPLACE_LINE_ITEM"; itemId: string; item: LineItem }
  | { type: "REORDER_CATEGORIES"; categories: Category[] }
  | {
      type: "PATCH_CATEGORY";
      id: string;
      patch: Partial<Pick<Category, "name" | "icon" | "order">>;
    };

interface MonthViewContextValue {
  month: MonthView["month"];
  categories: Category[];
  uncategorized: LineItem[];
  flatCategories: FlatCategory[];
  pendingItemIds: ReadonlySet<string>;
  isItemPending: (id: string) => boolean;
}

interface MonthViewActionsValue {
  setFromServer: (data: MonthViewState) => void;
  setPending: (id: string, pending: boolean) => void;
  addLineItem: (categoryId: string | null, item: LineItem) => void;
  removeLineItem: (itemId: string) => void;
  replaceLineItem: (itemId: string, item: LineItem) => void;
  reorderCategories: (categories: Category[]) => void;
  patchCategory: (id: string, patch: Partial<Pick<Category, "name" | "icon" | "order">>) => void;
}

const MonthViewContext = createContext<MonthViewContextValue | null>(null);
const MonthViewActionsContext = createContext<MonthViewActionsValue | null>(null);
const PendingIdsContext = createContext<ReadonlySet<string>>(new Set());

function findLineItemLocation(state: MonthViewState, itemId: string): LineItemLocation | null {
  for (let categoryIndex = 0; categoryIndex < state.categories.length; categoryIndex++) {
    const itemIndex = state.categories[categoryIndex].lineItems.findIndex((item) => item.id === itemId);
    if (itemIndex >= 0) {
      return { kind: "category", categoryIndex, itemIndex };
    }
  }

  const uncategorizedIndex = state.uncategorized.findIndex((item) => item.id === itemId);
  if (uncategorizedIndex >= 0) {
    return { kind: "uncategorized", itemIndex: uncategorizedIndex };
  }

  return null;
}

function withRecomputedBalance(state: MonthViewState): MonthViewState {
  return {
    ...state,
    month: {
      ...state.month,
      endingBalance: recomputeEndingBalance(
        state.month.lastMonthBalance,
        state.categories,
        state.uncategorized,
      ),
    },
  };
}

function monthViewReducer(state: MonthViewState, action: MonthViewAction): MonthViewState {
  switch (action.type) {
    case "SET_FROM_SERVER":
      return action.payload;

    case "SET_PENDING":
      return state;

    case "ADD_LINE_ITEM": {
      if (action.categoryId === null) {
        return withRecomputedBalance({
          ...state,
          uncategorized: [...state.uncategorized, action.item],
        });
      }

      const categories = state.categories.map((category) =>
        category.id === action.categoryId
          ? { ...category, lineItems: [...category.lineItems, action.item] }
          : category,
      );

      return withRecomputedBalance({ ...state, categories });
    }

    case "REMOVE_LINE_ITEM": {
      const location = findLineItemLocation(state, action.itemId);
      if (!location) {
        return state;
      }

      if (location.kind === "uncategorized") {
        const uncategorized = state.uncategorized.filter((_, index) => index !== location.itemIndex);
        return withRecomputedBalance({ ...state, uncategorized });
      }

      const categories = state.categories.map((category, categoryIndex) => {
        if (categoryIndex !== location.categoryIndex) {
          return category;
        }
        return {
          ...category,
          lineItems: category.lineItems.filter((_, index) => index !== location.itemIndex),
        };
      });

      return withRecomputedBalance({ ...state, categories });
    }

    case "REPLACE_LINE_ITEM": {
      const location = findLineItemLocation(state, action.itemId);
      if (!location) {
        return state;
      }

      if (location.kind === "uncategorized") {
        const uncategorized = state.uncategorized.map((item, index) =>
          index === location.itemIndex ? action.item : item,
        );
        return withRecomputedBalance({ ...state, uncategorized });
      }

      const categories = state.categories.map((category, categoryIndex) => {
        if (categoryIndex !== location.categoryIndex) {
          return category;
        }
        return {
          ...category,
          lineItems: category.lineItems.map((item, index) =>
            index === location.itemIndex ? action.item : item,
          ),
        };
      });

      return withRecomputedBalance({ ...state, categories });
    }

    case "REORDER_CATEGORIES": {
      const flatCategories = action.categories.map(({ id, name, order, icon }) => ({
        id,
        name,
        order,
        icon,
      }));
      return { ...state, categories: action.categories, flatCategories };
    }

    case "PATCH_CATEGORY": {
      const categories = state.categories.map((category) =>
        category.id === action.id ? { ...category, ...action.patch } : category,
      );
      const flatCategories = state.flatCategories.map((category) =>
        category.id === action.id ? { ...category, ...action.patch } : category,
      );
      return { ...state, categories, flatCategories };
    }

    default:
      return state;
  }
}

function monthViewDataKey(data: MonthViewState): string {
  const itemIds = [
    ...data.categories.flatMap((category) => category.lineItems.map((item) => item.id)),
    ...data.uncategorized.map((item) => item.id),
  ].join(",");
  const categoryIds = data.flatCategories.map((category) => category.id).join(",");
  return `${data.month.yearMonth}:${data.month.lastMonthBalance}:${data.month.endingBalance}:${categoryIds}:${itemIds}`;
}

interface MonthViewProviderProps {
  initialData: MonthViewState;
  children: ReactNode;
}

export function MonthViewProvider({ initialData, children }: MonthViewProviderProps) {
  const [state, dispatch] = useReducer(monthViewReducer, initialData);
  const [pendingItemIds, setPendingItemIds] = useReducer(
    (current: Set<string>, action: { type: "set"; id: string; pending: boolean }) => {
      const next = new Set(current);
      if (action.pending) {
        next.add(action.id);
      } else {
        next.delete(action.id);
      }
      return next;
    },
    new Set<string>(),
  );

  const serverDataKey = monthViewDataKey(initialData);

  // Re-seed from RSC when router.refresh() delivers new server data.
  // Skip sync while optimistic mutations are in flight.
  useEffect(() => {
    if (pendingItemIds.size > 0) {
      return;
    }
    dispatch({ type: "SET_FROM_SERVER", payload: initialData });
  }, [serverDataKey, initialData, pendingItemIds.size]);

  const setFromServer = useCallback((data: MonthViewState) => {
    dispatch({ type: "SET_FROM_SERVER", payload: data });
  }, []);

  const setPending = useCallback((id: string, pending: boolean) => {
    setPendingItemIds({ type: "set", id, pending });
    dispatch({ type: "SET_PENDING", id, pending });
  }, []);

  const addLineItem = useCallback((categoryId: string | null, item: LineItem) => {
    dispatch({ type: "ADD_LINE_ITEM", categoryId, item });
  }, []);

  const removeLineItem = useCallback((itemId: string) => {
    dispatch({ type: "REMOVE_LINE_ITEM", itemId });
  }, []);

  const replaceLineItem = useCallback((itemId: string, item: LineItem) => {
    dispatch({ type: "REPLACE_LINE_ITEM", itemId, item });
  }, []);

  const reorderCategories = useCallback((categories: Category[]) => {
    dispatch({ type: "REORDER_CATEGORIES", categories });
  }, []);

  const patchCategory = useCallback(
    (id: string, patch: Partial<Pick<Category, "name" | "icon" | "order">>) => {
      dispatch({ type: "PATCH_CATEGORY", id, patch });
    },
    [],
  );

  const isItemPending = useCallback((id: string) => pendingItemIds.has(id), [pendingItemIds]);

  const viewValue = useMemo<MonthViewContextValue>(
    () => ({
      month: state.month,
      categories: state.categories,
      uncategorized: state.uncategorized,
      flatCategories: state.flatCategories,
      pendingItemIds,
      isItemPending,
    }),
    [state, pendingItemIds, isItemPending],
  );

  const actionsValue = useMemo<MonthViewActionsValue>(
    () => ({
      setFromServer,
      setPending,
      addLineItem,
      removeLineItem,
      replaceLineItem,
      reorderCategories,
      patchCategory,
    }),
    [
      setFromServer,
      setPending,
      addLineItem,
      removeLineItem,
      replaceLineItem,
      reorderCategories,
      patchCategory,
    ],
  );

  return (
    <MonthViewActionsContext.Provider value={actionsValue}>
      <PendingIdsContext.Provider value={pendingItemIds}>
        <MonthViewContext.Provider value={viewValue}>{children}</MonthViewContext.Provider>
      </PendingIdsContext.Provider>
    </MonthViewActionsContext.Provider>
  );
}

export function useMonthView(): MonthViewContextValue {
  const ctx = useContext(MonthViewContext);
  if (!ctx) {
    throw new Error("useMonthView must be used within MonthViewProvider");
  }
  return ctx;
}

export function useMonthViewActions(): MonthViewActionsValue {
  const ctx = useContext(MonthViewActionsContext);
  if (!ctx) {
    throw new Error("useMonthViewActions must be used within MonthViewProvider");
  }
  return ctx;
}

export function useRowPending(id: string): boolean {
  const pendingIds = useContext(PendingIdsContext);
  return pendingIds.has(id);
}
