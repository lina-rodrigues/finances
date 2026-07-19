"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { addLineItemEntry, deleteLineItem, type FlatCategory, type LineItem } from "@/lib/api";
import { backgroundReconcile } from "@/lib/backgroundReconcile";
import {
  buildOptimisticAddEntry,
  createTempEntryId,
  extractLineItemSeriesMeta,
  toLineItemFromMutation,
} from "@/lib/lineItemMappers";
import { payRemainderAmount } from "@/lib/payLineItem";
import { type RecurrenceScope } from "@/lib/recurrence";
import { useTranslation } from "@/lib/i18n";
import { captureMonthViewState, useMonthView, useMonthViewActions } from "@/lib/MonthViewProvider";
import { canOptimisticallyDelete } from "@/lib/optimisticGates";
import { useMutationFeedback } from "@/lib/useMutationFeedback";

export interface LineItemDialogHostContext {
  flatCategories: FlatCategory[];
  yearMonth: string;
}

export interface LineItemActionHandlers {
  openDetail: (item: LineItem) => void;
  openAdd: (item: LineItem) => void;
  openEdit: (item: LineItem) => void;
  payItem: (item: LineItem) => Promise<void>;
  requestDelete: (item: LineItem) => void;
}

export function useLineItemDialogHost({ flatCategories, yearMonth }: LineItemDialogHostContext) {
  const router = useRouter();
  const { t } = useTranslation();
  const monthView = useMonthView();
  const { setFromServer, removeLineItem, replaceLineItem } = useMonthViewActions();
  const { run, runOptimistic } = useMutationFeedback();

  const [detailItem, setDetailItem] = useState<LineItem | null>(null);
  const [addItem, setAddItem] = useState<LineItem | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<LineItem | null>(null);
  const [initialCategoryName, setInitialCategoryName] = useState<string | undefined>();
  const [payingItemId, setPayingItemId] = useState<string | null>(null);
  const [deleteItem, setDeleteItem] = useState<LineItem | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [scopeDialogOpen, setScopeDialogOpen] = useState(false);
  const [scope, setScope] = useState<RecurrenceScope>("this");
  const [pessimisticDeleting, setPessimisticDeleting] = useState(false);

  const openDetail = useCallback((item: LineItem) => {
    setDetailItem(item);
  }, []);

  const openAdd = useCallback((item: LineItem) => {
    setAddItem(item);
  }, []);

  const openEdit = useCallback((item: LineItem) => {
    setEditItem(item);
  }, []);

  const openCreate = useCallback((categoryName?: string) => {
    setInitialCategoryName(categoryName);
    setCreateOpen(true);
  }, []);

  async function performDeletePessimistic(item: LineItem, selectedScope?: RecurrenceScope) {
    setPessimisticDeleting(true);
    try {
      await run(
        async () => {
          await deleteLineItem(
            item.id,
            item.seriesId && selectedScope ? { scope: selectedScope } : undefined,
          );
          setConfirmingDelete(false);
          setScopeDialogOpen(false);
          setDeleteItem(null);
          setDetailItem((current) => (current?.id === item.id ? null : current));
          router.refresh();
        },
        { successMessage: t("categories.itemDeleted") },
      );
    } finally {
      setPessimisticDeleting(false);
    }
  }

  async function performDeleteOptimistic(item: LineItem, selectedScope?: RecurrenceScope) {
    await runOptimistic({
      snapshot: () => captureMonthViewState(monthView),
      apply: () => {
        removeLineItem(item.id);
        setConfirmingDelete(false);
        setScopeDialogOpen(false);
        setDeleteItem(null);
        setDetailItem((current) => (current?.id === item.id ? null : current));
      },
      mutate: () =>
        deleteLineItem(
          item.id,
          item.seriesId && selectedScope ? { scope: selectedScope } : undefined,
        ),
      reconcile: () => backgroundReconcile(router),
      rollback: (snapshot) => setFromServer(snapshot),
      successMessage: t("categories.itemDeleted"),
    });
  }

  async function performDelete(item: LineItem, selectedScope?: RecurrenceScope) {
    if (canOptimisticallyDelete(selectedScope)) {
      await performDeleteOptimistic(item, selectedScope);
      return;
    }
    await performDeletePessimistic(item, selectedScope);
  }

  const requestDelete = useCallback((item: LineItem) => {
    setDeleteItem(item);
    if (item.seriesId) {
      setScope("this");
      setScopeDialogOpen(true);
      return;
    }
    setConfirmingDelete(true);
  }, []);

  const payItem = useCallback(
    async (item: LineItem) => {
      const remainder = payRemainderAmount(item);
      if (remainder === null) {
        return;
      }

      const tempEntry = {
        id: createTempEntryId(),
        amount: remainder,
        note: null,
        createdAt: new Date().toISOString(),
      };

      setPayingItemId(item.id);
      try {
        await runOptimistic({
          snapshot: () => captureMonthViewState(monthView),
          apply: () => {
            replaceLineItem(item.id, buildOptimisticAddEntry(item, tempEntry));
          },
          mutate: async () => {
            const response = await addLineItemEntry(item.id, { amount: remainder });
            replaceLineItem(
              item.id,
              toLineItemFromMutation(response.lineItem, extractLineItemSeriesMeta(item)),
            );
          },
          reconcile: () => backgroundReconcile(router),
          rollback: (snapshot) => setFromServer(snapshot),
          successMessage: t("entries.paid"),
        });
      } finally {
        setPayingItemId(null);
      }
    },
    [monthView, replaceLineItem, router, runOptimistic, setFromServer, t],
  );

  const handlers: LineItemActionHandlers = {
    openDetail,
    openAdd,
    openEdit,
    payItem,
    requestDelete,
  };

  return {
    handlers,
    openCreate,
    flatCategories,
    yearMonth,
    detailItem,
    setDetailItem,
    addItem,
    setAddItem,
    createOpen,
    setCreateOpen,
    editItem,
    setEditItem,
    initialCategoryName,
    payingItemId,
    deleteItem,
    confirmingDelete,
    setConfirmingDelete,
    scopeDialogOpen,
    setScopeDialogOpen,
    scope,
    setScope,
    pessimisticDeleting,
    performDelete,
  };
}
