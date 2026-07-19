"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { deleteLineItem, type FlatCategory, type LineItem } from "@/lib/api";
import { backgroundReconcile } from "@/lib/backgroundReconcile";
import { isPayDisabled } from "@/lib/payLineItem";
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
  payItem: (item: LineItem) => void;
  requestDelete: (item: LineItem) => void;
}

export function useLineItemDialogHost({ flatCategories, yearMonth }: LineItemDialogHostContext) {
  const router = useRouter();
  const { t } = useTranslation();
  const monthView = useMonthView();
  const { setFromServer, removeLineItem } = useMonthViewActions();
  const { run, runOptimistic } = useMutationFeedback();

  const [detailItem, setDetailItem] = useState<LineItem | null>(null);
  const [addItem, setAddItem] = useState<LineItem | null>(null);
  const [payItem, setPayItem] = useState<LineItem | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<LineItem | null>(null);
  const [initialCategoryName, setInitialCategoryName] = useState<string | undefined>();
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

  const openPay = useCallback((item: LineItem) => {
    if (isPayDisabled(item)) {
      return;
    }
    setPayItem(item);
  }, []);

  const handlers: LineItemActionHandlers = {
    openDetail,
    openAdd,
    openEdit,
    payItem: openPay,
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
    payItem,
    setPayItem,
    createOpen,
    setCreateOpen,
    editItem,
    setEditItem,
    initialCategoryName,
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
