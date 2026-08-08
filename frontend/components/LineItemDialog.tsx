"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
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
  const formId = useId();
  const categoryFieldId = useId();
  const labelFieldId = useId();
  const labelInputRef = useRef<HTMLElement | null>(null);
  const dialogRef = useRef<HTMLElement | null>(null);
  const openRef = useRef(open);
  openRef.current = open;

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
    const el = dialogRef.current;
    if (!el) return;
    const onAfterHide = () => {
      if (openRef.current) onOpenChange(false);
    };
    el.addEventListener("wa-after-hide", onAfterHide);
    return () => el.removeEventListener("wa-after-hide", onAfterHide);
  }, [onOpenChange]);

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
      const timer = window.setTimeout(() => labelInputRef.current?.focus(), 0);
      return () => window.clearTimeout(timer);
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
      snapshot: (): LineItemOptimisticSnapshot => ({
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
      snapshot: (): LineItemOptimisticSnapshot => ({
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

  const activeSubmit =
    mode === "create"
      ? handleCreateSubmit
      : editSubFlow === "makeRecurring"
        ? handleMakeRecurringSubmit
        : handleEditSubmit;

  return (
    <>
      <wa-dialog
        ref={dialogRef}
        label={dialogTitle}
        open={open || undefined}
        light-dismiss
        data-testid={testId}
        style={{ "--width": "32rem" } as React.CSSProperties}
      >
        <form id={formId} onSubmit={activeSubmit} className="wa-stack wa-gap-m">
          {mode === "create" ? (
            <>
              <CategoryCombobox
                id={categoryFieldId}
                value={categoryName}
                onChange={setCategoryName}
                categories={categories}
                disabled={loading}
              />

              <wa-select
                id={`${categoryFieldId}-type`}
                label={t("addItem.type")}
                value={type}
                disabled={loading || undefined}
                onChange={(event) => setType((event.target as HTMLSelectElement).value as LineItemType)}
              >
                <wa-option value="expense">{t("categories.expense")}</wa-option>
                <wa-option value="income">{t("categories.income")}</wa-option>
              </wa-select>

              <wa-input
                ref={labelInputRef}
                id={labelFieldId}
                label={t("addItem.label")}
                placeholder={t("addItem.label")}
                value={label}
                onInput={(event) => setLabel((event.target as HTMLInputElement).value)}
                required
                disabled={loading || undefined}
              ></wa-input>

              <wa-input
                id={`${labelFieldId}-planned`}
                label={t("addItem.planned")}
                type="number"
                step="0.01"
                placeholder={t("addItem.planned")}
                value={plannedAmount}
                onInput={(event) => setPlannedAmount((event.target as HTMLInputElement).value)}
                required
                disabled={loading || undefined}
              ></wa-input>

              <wa-input
                id={`${labelFieldId}-realized`}
                label={t("addItem.realized")}
                type="number"
                step="0.01"
                placeholder={t("categories.realized")}
                value={realizedAmount}
                onInput={(event) => setRealizedAmount((event.target as HTMLInputElement).value)}
                disabled={loading || undefined}
              ></wa-input>

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
            </>
          ) : null}

          {mode === "edit" && editSubFlow === "edit" ? (
            <>
              <wa-input
                id={labelFieldId}
                label={t("addItem.label")}
                placeholder={t("addItem.label")}
                value={label}
                onInput={(event) => setLabel((event.target as HTMLInputElement).value)}
                required
                disabled={loading || undefined}
              ></wa-input>

              <wa-input
                id={`${labelFieldId}-planned`}
                label={t("addItem.planned")}
                type="number"
                step="0.01"
                placeholder={t("addItem.planned")}
                value={plannedAmount}
                onInput={(event) => setPlannedAmount((event.target as HTMLInputElement).value)}
                required
                disabled={loading || undefined}
              ></wa-input>

              {item && item.entryCount > 0 ? (
                <div className="wa-stack wa-gap-2xs">
                  <span className="wa-caption-m wa-color-text-quiet">{t("addItem.realized")}</span>
                  <p
                    className={`metric-amount--inline ${item.type === "income" ? "metric-amount--income" : "metric-amount--expense"}`}
                    style={{ margin: 0 }}
                  >
                    {item.type === "income" ? "+" : "-"}
                    {formatMoney(item.realizedAmount ?? 0)}
                  </p>
                  <p className="wa-caption-m wa-color-text-quiet" style={{ margin: 0 }}>
                    {t("entries.entriesManagedHint")}
                  </p>
                </div>
              ) : (
                <wa-input
                  id={`${labelFieldId}-realized`}
                  label={t("addItem.realized")}
                  type="number"
                  step="0.01"
                  placeholder={t("categories.realized")}
                  value={realizedAmount}
                  onInput={(event) => setRealizedAmount((event.target as HTMLInputElement).value)}
                  disabled={loading || undefined}
                ></wa-input>
              )}

              {item && !item.seriesId ? (
                <wa-button
                  type="button"
                  variant="neutral"
                  appearance="outlined"
                  size="s"
                  disabled={loading || undefined}
                  onClick={() => {
                    setRepeatMode("never");
                    setStartYearMonth(yearMonth);
                    setOccurrenceCount("12");
                    setEndYearMonth(yearMonth);
                    setEditSubFlow("makeRecurring");
                  }}
                >
                  <wa-icon slot="start" name="arrows-rotate"></wa-icon>
                  {t("repeat.makeRecurring")}
                </wa-button>
              ) : null}
            </>
          ) : null}

          {mode === "edit" && editSubFlow === "makeRecurring" && item ? (
            <>
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

              {loading ? (
                <p className="wa-caption-l wa-color-text-quiet" style={{ margin: 0 }}>
                  {t("repeat.updatingSeries")}
                </p>
              ) : null}
            </>
          ) : null}
        </form>

        <div slot="footer" className="wa-cluster wa-gap-s">
          <wa-button
            type="button"
            variant="neutral"
            appearance="outlined"
            size="s"
            disabled={loading || undefined}
            onClick={handleCancel}
          >
            <wa-icon slot="start" name="xmark"></wa-icon>
            {t("common.cancel")}
          </wa-button>
          {mode === "create" ? (
            <wa-button
              type="submit"
              form={formId}
              variant="brand"
              size="s"
              loading={loading || undefined}
              disabled={loading || undefined}
            >
              <wa-icon slot="start" name="plus"></wa-icon>
              {t("addItem.submit")}
            </wa-button>
          ) : null}
          {mode === "edit" && editSubFlow === "edit" ? (
            <wa-button
              type="submit"
              form={formId}
              variant="brand"
              size="s"
              loading={loading || undefined}
              disabled={loading || undefined}
            >
              <wa-icon slot="start" name="floppy-disk"></wa-icon>
              {t("editItem.submit")}
            </wa-button>
          ) : null}
          {mode === "edit" && editSubFlow === "makeRecurring" ? (
            <wa-button
              type="submit"
              form={formId}
              variant="brand"
              size="s"
              loading={loading || undefined}
              disabled={loading || repeatMode === "none" || undefined}
            >
              <wa-icon slot="start" name="arrows-rotate"></wa-icon>
              {t("repeat.makeRecurringSubmit")}
            </wa-button>
          ) : null}
        </div>
      </wa-dialog>

      {mode === "edit" && item ? (
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
      ) : null}
    </>
  );
}
