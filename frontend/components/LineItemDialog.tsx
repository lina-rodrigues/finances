"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { CategoryCombobox } from "@/components/CategoryCombobox";
import { RepeatConfigFields } from "@/components/RepeatConfigFields";
import { RepeatScopeDialog } from "@/components/RepeatScopeDialog";
import {
  convertLineItemToRecurrence,
  createCategory,
  createLineItem,
  updateLineItem,
  type FlatCategory,
  type LineItem,
  type LineItemType,
} from "@/lib/api";
import {
  buildRecurrencePayload,
  type RecurrenceScope,
  type RepeatMode,
} from "@/lib/recurrence";
import { backgroundReconcile } from "@/lib/backgroundReconcile";
import {
  buildOptimisticCreateLineItem,
  buildOptimisticLineItem,
  createTempLineItemId,
  extractLineItemSeriesMeta,
  resolveCategoryIdSync,
  toLineItemFromMutation,
} from "@/lib/lineItemMappers";
import {
  captureMonthViewState,
  useMonthView,
  useMonthViewActions,
} from "@/lib/MonthViewProvider";
import { canOptimisticallyCreate, canOptimisticallyEdit } from "@/lib/optimisticGates";
import { useTranslation } from "@/lib/i18n";
import { useMutationFeedback } from "@/lib/useMutationFeedback";
import { useFormatCurrency } from "@/lib/useFormatCurrency";

import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner,
  Icon,
} from "@lina-rodrigues/cotton-candy";
type LineItemDialogMode = "create" | "edit";
type EditSubFlow = "edit" | "makeRecurring";

interface DialogFormSnapshot {
  editSubFlow: EditSubFlow;
  categoryName: string;
  type: LineItemType;
  label: string;
  plannedAmount: string;
  realizedAmount: string;
  repeatMode: RepeatMode;
  startYearMonth: string;
  occurrenceCount: string;
  endYearMonth: string;
  scope: RecurrenceScope;
  scopeDialogOpen: boolean;
}

interface LineItemOptimisticSnapshot {
  monthView: ReturnType<typeof captureMonthViewState>;
  form: DialogFormSnapshot;
}

interface LineItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: LineItemDialogMode;
  categories: FlatCategory[];
  yearMonth: string;
  initialCategoryName?: string;
  item?: LineItem;
}

export function LineItemDialog({
  open,
  onOpenChange,
  mode,
  categories,
  yearMonth,
  initialCategoryName,
  item,
}: LineItemDialogProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const formatMoney = useFormatCurrency();
  const uncategorizedLabel = t("common.uncategorized");
  const monthView = useMonthView();
  const { setFromServer, setPending, addLineItem, replaceLineItem } = useMonthViewActions();
  const { loading, run, runOptimistic } = useMutationFeedback();
  const categoryFieldId = useId();
  const labelFieldId = useId();
  const labelInputRef = useRef<HTMLInputElement>(null);

  const [editSubFlow, setEditSubFlow] = useState<EditSubFlow>("edit");
  const [scopeDialogOpen, setScopeDialogOpen] = useState(false);
  const [scope, setScope] = useState<RecurrenceScope>("this");

  const [categoryName, setCategoryName] = useState(initialCategoryName ?? uncategorizedLabel);
  const [type, setType] = useState<LineItemType>("expense");
  const [label, setLabel] = useState("");
  const [plannedAmount, setPlannedAmount] = useState("");
  const [realizedAmount, setRealizedAmount] = useState("");
  const [repeatMode, setRepeatMode] = useState<RepeatMode>("none");
  const [startYearMonth, setStartYearMonth] = useState(yearMonth);
  const [occurrenceCount, setOccurrenceCount] = useState("12");
  const [endYearMonth, setEndYearMonth] = useState(yearMonth);

  function captureDialogForm(): DialogFormSnapshot {
    return {
      editSubFlow,
      categoryName,
      type,
      label,
      plannedAmount,
      realizedAmount,
      repeatMode,
      startYearMonth,
      occurrenceCount,
      endYearMonth,
      scope,
      scopeDialogOpen,
    };
  }

  function restoreDialogForm(form: DialogFormSnapshot) {
    setEditSubFlow(form.editSubFlow);
    setCategoryName(form.categoryName);
    setType(form.type);
    setLabel(form.label);
    setPlannedAmount(form.plannedAmount);
    setRealizedAmount(form.realizedAmount);
    setRepeatMode(form.repeatMode);
    setStartYearMonth(form.startYearMonth);
    setOccurrenceCount(form.occurrenceCount);
    setEndYearMonth(form.endYearMonth);
    setScope(form.scope);
    setScopeDialogOpen(form.scopeDialogOpen);
    onOpenChange(true);
  }

  useEffect(() => {
    if (!open) {
      return;
    }

    if (mode === "create") {
      setEditSubFlow("edit");
      setCategoryName(initialCategoryName ?? uncategorizedLabel);
      setType("expense");
      setLabel("");
      setPlannedAmount("");
      setRealizedAmount("");
      setRepeatMode("none");
      setStartYearMonth(yearMonth);
      setOccurrenceCount("12");
      setEndYearMonth(yearMonth);
      return;
    }

    if (item) {
      setEditSubFlow("edit");
      setLabel(item.label);
      setPlannedAmount(String(item.plannedAmount));
      setRealizedAmount(item.realizedAmount !== null ? String(item.realizedAmount) : "");
      setRepeatMode("never");
      setStartYearMonth(yearMonth);
      setOccurrenceCount("12");
      setEndYearMonth(yearMonth);
    }
  }, [open, mode, item, initialCategoryName, uncategorizedLabel, yearMonth]);

  async function resolveCategoryId(trimmed: string): Promise<string | null> {
    if (trimmed.toLowerCase() === uncategorizedLabel.toLowerCase()) {
      return null;
    }

    const existing = categories.find((cat) => cat.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) {
      return existing.id;
    }

    const created = await createCategory({ name: trimmed });
    return created.id;
  }

  async function performEditSave(selectedScope?: RecurrenceScope) {
    if (!item) {
      return;
    }

    const planned = parseFloat(plannedAmount);
    const realized = realizedAmount === "" ? null : parseFloat(realizedAmount);
    const updatePayload = {
      label,
      plannedAmount: planned,
      ...(item.entryCount > 0 ? {} : { realizedAmount: realized }),
      ...(item.seriesId && selectedScope ? { scope: selectedScope } : {}),
    };

    if (!canOptimisticallyEdit(selectedScope)) {
      await run(
        async () => {
          await updateLineItem(item.id, updatePayload);
          onOpenChange(false);
          setScopeDialogOpen(false);
          router.refresh();
        },
        { successMessage: t("categories.itemUpdated") },
      );
      return;
    }

    const seriesMeta = extractLineItemSeriesMeta(item);
    const optimisticItem = buildOptimisticLineItem(item, {
      label,
      plannedAmount: planned,
      realizedAmount: item.entryCount > 0 ? item.realizedAmount : realized,
    });

    await runOptimistic({
      snapshot: () => ({
        monthView: captureMonthViewState(monthView),
        form: captureDialogForm(),
      }),
      apply: () => {
        replaceLineItem(item.id, optimisticItem);
        setPending(item.id, true);
        onOpenChange(false);
        setScopeDialogOpen(false);
      },
      mutate: async () => {
        const response = await updateLineItem(item.id, updatePayload);
        replaceLineItem(item.id, toLineItemFromMutation(response, seriesMeta));
        setPending(item.id, false);
      },
      reconcile: () => backgroundReconcile(router),
      rollback: ({ monthView: monthSnapshot, form }) => {
        setPending(item.id, false);
        setFromServer(monthSnapshot);
        restoreDialogForm(form);
      },
      successMessage: t("categories.itemUpdated"),
    });
  }

  async function handleCreateSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmedCategory = categoryName.trim();
    if (!trimmedCategory || !label || !plannedAmount) {
      return;
    }

    const recurrence = buildRecurrencePayload(
      repeatMode,
      startYearMonth,
      occurrenceCount,
      endYearMonth,
    );

    if (repeatMode !== "none" && !recurrence) {
      return;
    }

    const categoryId = resolveCategoryIdSync(trimmedCategory, categories, uncategorizedLabel);
    const needsNewCategory = categoryId === undefined;

    if (!canOptimisticallyCreate(repeatMode, needsNewCategory) || categoryId === undefined) {
      await run(
        async () => {
          const resolvedCategoryId = await resolveCategoryId(trimmedCategory);
          await createLineItem(yearMonth, {
            categoryId: resolvedCategoryId,
            type,
            label,
            plannedAmount: parseFloat(plannedAmount),
            realizedAmount: realizedAmount === "" ? null : parseFloat(realizedAmount),
            recurrence,
          });
          onOpenChange(false);
          router.refresh();
        },
        { successMessage: t("categories.itemAdded") },
      );
      return;
    }

    const planned = parseFloat(plannedAmount);
    const realized = realizedAmount === "" ? null : parseFloat(realizedAmount);
    const tempId = createTempLineItemId();
    const optimisticItem = buildOptimisticCreateLineItem({
      id: tempId,
      type,
      label,
      plannedAmount: planned,
      realizedAmount: realized,
    });

    await runOptimistic({
      snapshot: () => ({
        monthView: captureMonthViewState(monthView),
        form: captureDialogForm(),
      }),
      apply: () => {
        addLineItem(categoryId, optimisticItem);
        setPending(tempId, true);
        onOpenChange(false);
      },
      mutate: async () => {
        const response = await createLineItem(yearMonth, {
          categoryId,
          type,
          label,
          plannedAmount: planned,
          realizedAmount: realized,
        });
        replaceLineItem(tempId, toLineItemFromMutation(response));
        setPending(tempId, false);
      },
      reconcile: () => backgroundReconcile(router),
      rollback: ({ monthView: monthSnapshot, form }) => {
        setPending(tempId, false);
        setFromServer(monthSnapshot);
        restoreDialogForm(form);
      },
      successMessage: t("categories.itemAdded"),
    });
  }

  async function handleEditSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!item) {
      return;
    }

    if (item.seriesId) {
      setScope("this");
      setScopeDialogOpen(true);
      return;
    }

    await performEditSave();
  }

  async function handleMakeRecurringSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!item) {
      return;
    }

    const recurrence = buildRecurrencePayload(
      repeatMode,
      startYearMonth,
      occurrenceCount,
      endYearMonth,
    );

    if (!recurrence) {
      return;
    }

    await run(
      async () => {
        await convertLineItemToRecurrence(item.id, recurrence);
        onOpenChange(false);
        router.refresh();
      },
      { successMessage: t("repeat.seriesMadeRecurring") },
    );
  }

  function handleCancel() {
    if (mode === "edit" && editSubFlow === "makeRecurring") {
      setEditSubFlow("edit");
      return;
    }
    onOpenChange(false);
  }

  const dialogTitle =
    mode === "create"
      ? t("addItem.title")
      : editSubFlow === "makeRecurring"
        ? t("repeat.makeRecurringTitle")
        : t("editItem.title");

  const testId = mode === "create" ? "add-line-item-dialog" : "edit-line-item-dialog";

  const typeItems = useMemo(
    () => ({
      expense: t("categories.expense"),
      income: t("categories.income"),
    }),
    [t],
  );

  function handleDialogOpenAutoFocus(event: Event) {
    if (mode !== "create") {
      return;
    }
    event.preventDefault();
    labelInputRef.current?.focus();
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          data-testid={testId}
          className="max-h-[85dvh] overflow-x-hidden overflow-y-auto"
          onOpenAutoFocus={handleDialogOpenAutoFocus}
        >
          <DialogHeader>
            <DialogTitle className="text-display text-xs normal-case">{dialogTitle}</DialogTitle>
          </DialogHeader>

          {mode === "create" && (
            <form onSubmit={handleCreateSubmit} className="finance-dialog-form space-y-3">
              <CategoryCombobox
                id={categoryFieldId}
                value={categoryName}
                onChange={setCategoryName}
                categories={categories}
                disabled={loading}
              />

              <div className="space-y-1">
                <label htmlFor={`${categoryFieldId}-type`} className="text-body text-sm font-semibold">
                  {t("addItem.type")}
                </label>
                <div className="finance-dialog-field">
                  <Select
                    value={type}
                    items={typeItems}
                    onValueChange={(value) => setType(value as LineItemType)}
                    disabled={loading}
                  >
                    <SelectTrigger id={`${categoryFieldId}-type`} size="sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="expense">{t("categories.expense")}</SelectItem>
                      <SelectItem value="income">{t("categories.income")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor={labelFieldId} className="text-body text-sm font-semibold">
                  {t("addItem.label")}
                </label>
                <div className="finance-dialog-field">
                  <Input
                    ref={labelInputRef}
                    id={labelFieldId}
                    placeholder={t("addItem.label")}
                    value={label}
                    onChange={(event) => setLabel(event.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor={`${labelFieldId}-planned`} className="text-body text-sm font-semibold">
                  {t("addItem.planned")}
                </label>
                <div className="finance-dialog-field">
                  <Input
                    id={`${labelFieldId}-planned`}
                    type="number"
                    step="0.01"
                    placeholder={t("addItem.planned")}
                    value={plannedAmount}
                    onChange={(event) => setPlannedAmount(event.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor={`${labelFieldId}-realized`} className="text-body text-sm font-semibold">
                  {t("addItem.realized")}
                </label>
                <div className="finance-dialog-field">
                  <Input
                    id={`${labelFieldId}-realized`}
                    type="number"
                    step="0.01"
                    placeholder={t("categories.realized")}
                    value={realizedAmount}
                    onChange={(event) => setRealizedAmount(event.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>

              <RepeatConfigFields
                idPrefix={labelFieldId}
                mode={repeatMode}
                onModeChange={setRepeatMode}
                startYearMonth={startYearMonth}
                onStartYearMonthChange={setStartYearMonth}
                occurrenceCount={occurrenceCount}
                onOccurrenceCountChange={setOccurrenceCount}
                endYearMonth={endYearMonth}
                onEndYearMonthChange={setEndYearMonth}
                disabled={loading}
              />

              <DialogFooter className="gap-2 border-t border-border pt-3 sm:justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="pressable focus-ring gap-1"
                  onClick={() => onOpenChange(false)}
                  disabled={loading}
                >
                  <Icon name="cancel" size="xs" />
                  {t("common.cancel")}
                </Button>
                <Button
                  type="submit"
                  variant="default"
                  size="sm"
                  className="pressable focus-ring gap-1"
                  disabled={loading}
                >
                  {loading ? <Spinner className="size-4" /> : <Icon name="add" size="xs" />}
                  {t("addItem.submit")}
                </Button>
              </DialogFooter>
            </form>
          )}

          {mode === "edit" && editSubFlow === "edit" && (
            <form onSubmit={handleEditSubmit} className="finance-dialog-form space-y-3">
              <div className="space-y-1">
                <label htmlFor={labelFieldId} className="text-body text-sm font-semibold">
                  {t("addItem.label")}
                </label>
                <div className="finance-dialog-field">
                  <Input
                    id={labelFieldId}
                    placeholder={t("addItem.label")}
                    value={label}
                    onChange={(event) => setLabel(event.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor={`${labelFieldId}-planned`} className="text-body text-sm font-semibold">
                  {t("addItem.planned")}
                </label>
                <div className="finance-dialog-field">
                  <Input
                    id={`${labelFieldId}-planned`}
                    type="number"
                    step="0.01"
                    placeholder={t("addItem.planned")}
                    value={plannedAmount}
                    onChange={(event) => setPlannedAmount(event.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor={`${labelFieldId}-realized`} className="text-body text-sm font-semibold">
                  {t("addItem.realized")}
                </label>
                {item && item.entryCount > 0 ? (
                  <div className="finance-dialog-field space-y-1">
                    <p className={`text-amount text-sm ${item.type === "income" ? "text-income" : "text-expense"}`}>
                      {item.type === "income" ? "+" : "-"}
                      {formatMoney(item.realizedAmount ?? 0)}
                    </p>
                    <p className="text-body text-muted-finance text-xs">{t("entries.entriesManagedHint")}</p>
                  </div>
                ) : (
                  <div className="finance-dialog-field">
                    <Input
                      id={`${labelFieldId}-realized`}
                      type="number"
                      step="0.01"
                      placeholder={t("categories.realized")}
                      value={realizedAmount}
                      onChange={(event) => setRealizedAmount(event.target.value)}
                      disabled={loading}
                    />
                  </div>
                )}
              </div>

              {item && !item.seriesId && (
                <div className="border-t border-border pt-3">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="pressable focus-ring w-full gap-1 sm:w-auto"
                    onClick={() => {
                      setRepeatMode("never");
                      setStartYearMonth(yearMonth);
                      setOccurrenceCount("12");
                      setEndYearMonth(yearMonth);
                      setEditSubFlow("makeRecurring");
                    }}
                    disabled={loading}
                  >
                    <Icon name="repeat" size="xs" />
                    {t("repeat.makeRecurring")}
                  </Button>
                </div>
              )}

              <DialogFooter className="gap-2 border-t border-border pt-3 sm:justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="pressable focus-ring gap-1"
                  onClick={handleCancel}
                  disabled={loading}
                >
                  <Icon name="cancel" size="xs" />
                  {t("common.cancel")}
                </Button>
                <Button
                  type="submit"
                  variant="default"
                  size="sm"
                  className="pressable focus-ring gap-1"
                  disabled={loading}
                >
                  {loading ? <Spinner className="size-4" /> : <Icon name="save" size="xs" />}
                  {t("editItem.submit")}
                </Button>
              </DialogFooter>
            </form>
          )}

          {mode === "edit" && editSubFlow === "makeRecurring" && item && (
            <form onSubmit={handleMakeRecurringSubmit} className="finance-dialog-form space-y-3">
              <RepeatConfigFields
                idPrefix={`make-recurring-${item.id}`}
                mode={repeatMode}
                onModeChange={setRepeatMode}
                startYearMonth={startYearMonth}
                onStartYearMonthChange={setStartYearMonth}
                occurrenceCount={occurrenceCount}
                onOccurrenceCountChange={setOccurrenceCount}
                endYearMonth={endYearMonth}
                onEndYearMonthChange={setEndYearMonth}
                disabled={loading}
                hideNoneOption
                lockStartMonth
              />

              {loading && (
                <p className="text-body text-muted-finance text-sm">{t("repeat.updatingSeries")}</p>
              )}

              <DialogFooter className="gap-2 border-t border-border pt-3 sm:justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="pressable focus-ring gap-1"
                  onClick={handleCancel}
                  disabled={loading}
                >
                  <Icon name="cancel" size="xs" />
                  {t("common.cancel")}
                </Button>
                <Button
                  type="submit"
                  variant="default"
                  size="sm"
                  className="pressable focus-ring gap-1"
                  disabled={loading || repeatMode === "none"}
                >
                  {loading ? <Spinner className="size-4" /> : <Icon name="repeat" size="xs" />}
                  {t("repeat.makeRecurringSubmit")}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {mode === "edit" && item && (
        <RepeatScopeDialog
          open={scopeDialogOpen}
          onOpenChange={(isOpen) => {
            if (!isOpen) {
              setScopeDialogOpen(false);
            }
          }}
          mode="edit"
          scope={scope}
          onScopeChange={setScope}
          loading={loading}
          loadingDescription={t("repeat.updatingSeries")}
          onConfirm={() => performEditSave(scope)}
        />
      )}
    </>
  );
}
