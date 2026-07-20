"use client";

import { useRouter } from "next/navigation";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { CategoryIconPicker } from "@/components/CategoryIconPicker";
import { Icon } from "@/components/Icon";
import { Badge } from "@/components/ui/pixelact-ui/badge";
import { Button } from "@/components/ui/pixelact-ui/button";
import { Input } from "@/components/ui/pixelact-ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/pixelact-ui/select";
import { Spinner } from "@/components/ui/pixelact-ui/spinner";
import {
  createCategory,
  deleteCategory,
  reorderCategories,
  updateCategory,
  type BudgetGroup,
  type Category,
  type FlatCategory,
} from "@/lib/api";
import { backgroundReconcile } from "@/lib/backgroundReconcile";
import { buildOptimisticCategory, createTempCategoryId } from "@/lib/categoryMappers";
import {
  captureMonthViewState,
  useMonthView,
  useMonthViewActions,
} from "@/lib/MonthViewProvider";
import { resolveCategoryIcon, type IconName } from "@/lib/icons";
import { useTranslation } from "@/lib/i18n";
import { useMutationFeedback } from "@/lib/useMutationFeedback";

interface EditableCategory extends FlatCategory {
  draftName: string;
  draftIcon: IconName;
  draftBudgetGroup: BudgetGroup | null;
}

type BudgetGroupOption = "default" | BudgetGroup;

function toBudgetGroupOption(budgetGroup: BudgetGroup | null): BudgetGroupOption {
  return budgetGroup ?? "default";
}

function fromBudgetGroupOption(option: BudgetGroupOption): BudgetGroup | null {
  return option === "default" ? null : option;
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

function toEditable(cat: FlatCategory): EditableCategory {
  return {
    ...cat,
    draftName: cat.name,
    draftIcon: resolveCategoryIcon(cat.icon),
    draftBudgetGroup: cat.budgetGroup,
  };
}

function sortToEditable(cats: FlatCategory[]): EditableCategory[] {
  return [...cats].sort((a, b) => a.order - b.order).map(toEditable);
}

function buildReorderedCategories(
  editableOrder: EditableCategory[],
  fullCategories: Category[],
): Category[] {
  const byId = new Map(fullCategories.map((category) => [category.id, category]));
  return editableOrder.map((editable, order) => {
    const full = byId.get(editable.id);
    if (!full) {
      throw new Error(`Category ${editable.id} not found in month view`);
    }
    return { ...full, order };
  });
}

function isDirty(cat: EditableCategory): boolean {
  return (
    cat.draftName.trim() !== cat.name ||
    cat.draftIcon !== resolveCategoryIcon(cat.icon) ||
    cat.draftBudgetGroup !== cat.budgetGroup
  );
}

interface CategoryManagerEditorProps {
  onRequestClose?: () => void;
}

export interface CategoryManagerEditorHandle {
  requestClose: () => boolean;
}

export const CategoryManagerEditor = forwardRef<
  CategoryManagerEditorHandle,
  CategoryManagerEditorProps
>(function CategoryManagerEditor({ onRequestClose }, ref) {
  const router = useRouter();
  const { t } = useTranslation();
  const monthView = useMonthView();
  const {
    setFromServer,
    reorderCategories: reorderCategoriesInView,
    patchCategory,
    addCategory,
    removeCategory,
    replaceCategoryId,
  } = useMonthViewActions();
  const { loading: addLoading, runOptimistic } = useMutationFeedback();

  const [categories, setCategories] = useState<EditableCategory[]>(() =>
    sortToEditable(monthView.flatCategories),
  );
  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState<IconName>("category");
  const [deletingCategory, setDeletingCategory] = useState<EditableCategory | null>(null);
  const [reordering, setReordering] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [saveStatus, setSaveStatus] = useState<Record<string, SaveStatus>>({});
  const [unsavedConfirmOpen, setUnsavedConfirmOpen] = useState(false);

  const saveTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const savedFadeTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    setCategories(sortToEditable(monthView.flatCategories));
  }, [monthView.flatCategories]);

  useEffect(() => {
    return () => {
      for (const timer of saveTimers.current.values()) {
        clearTimeout(timer);
      }
      for (const timer of savedFadeTimers.current.values()) {
        clearTimeout(timer);
      }
    };
  }, []);

  const restoreFromSnapshot = useCallback(
    (snapshot: ReturnType<typeof captureMonthViewState>) => {
      setFromServer(snapshot);
      setCategories(sortToEditable(snapshot.flatCategories));
    },
    [setFromServer],
  );

  const setRowStatus = useCallback((id: string, status: SaveStatus) => {
    setSaveStatus((prev) => ({ ...prev, [id]: status }));

    const existingFade = savedFadeTimers.current.get(id);
    if (existingFade) {
      clearTimeout(existingFade);
      savedFadeTimers.current.delete(id);
    }

    if (status === "saved") {
      savedFadeTimers.current.set(
        id,
        setTimeout(() => {
          setSaveStatus((prev) => (prev[id] === "saved" ? { ...prev, [id]: "idle" } : prev));
          savedFadeTimers.current.delete(id);
        }, 2000),
      );
    }
  }, []);

  const persistCategory = useCallback(
    async (cat: EditableCategory) => {
      if (!cat.draftName.trim() || !isDirty(cat)) {
        return;
      }

      const trimmedName = cat.draftName.trim();
      setRowStatus(cat.id, "saving");

      const ok = await runOptimistic({
        snapshot: () => captureMonthViewState(monthView),
        apply: () => {
          patchCategory(cat.id, {
            name: trimmedName,
            icon: cat.draftIcon,
            budgetGroup: cat.draftBudgetGroup,
          });
          setCategories((prev) =>
            prev.map((entry) =>
              entry.id === cat.id
                ? {
                    ...entry,
                    name: trimmedName,
                    icon: cat.draftIcon,
                    budgetGroup: cat.draftBudgetGroup,
                    draftName: trimmedName,
                    draftIcon: cat.draftIcon,
                    draftBudgetGroup: cat.draftBudgetGroup,
                  }
                : entry,
            ),
          );
        },
        mutate: () =>
          updateCategory(cat.id, {
            name: trimmedName,
            icon: cat.draftIcon,
            budgetGroup: cat.draftBudgetGroup,
          }),
        reconcile: () => backgroundReconcile(router),
        rollback: restoreFromSnapshot,
        successMessage: undefined,
      });

      setRowStatus(cat.id, ok ? "saved" : "error");
    },
    [monthView, patchCategory, restoreFromSnapshot, router, runOptimistic, setRowStatus],
  );

  const scheduleSave = useCallback(
    (cat: EditableCategory) => {
      const existing = saveTimers.current.get(cat.id);
      if (existing) {
        clearTimeout(existing);
      }

      if (!isDirty(cat) || !cat.draftName.trim()) {
        saveTimers.current.delete(cat.id);
        return;
      }

      saveTimers.current.set(
        cat.id,
        setTimeout(() => {
          saveTimers.current.delete(cat.id);
          void persistCategory(cat);
        }, 500),
      );
    },
    [persistCategory],
  );

  function updateDraft(
    id: string,
    patch: Partial<Pick<EditableCategory, "draftName" | "draftIcon" | "draftBudgetGroup">>,
  ) {
    setCategories((prev) => {
      const next = prev.map((cat) => (cat.id === id ? { ...cat, ...patch } : cat));
      const updated = next.find((cat) => cat.id === id);
      if (updated) {
        scheduleSave(updated);
      }
      return next;
    });
  }

  async function applyReorder(reordered: EditableCategory[]) {
    const items = reordered.map((cat, order) => ({ id: cat.id, order }));
    const reorderedFull = buildReorderedCategories(reordered, monthView.categories);

    setReordering(true);
    await runOptimistic({
      snapshot: () => captureMonthViewState(monthView),
      apply: () => {
        setCategories(reordered);
        reorderCategoriesInView(reorderedFull);
      },
      mutate: () => reorderCategories(items),
      reconcile: () => backgroundReconcile(router),
      rollback: restoreFromSnapshot,
      successMessage: undefined,
    });
    setReordering(false);
  }

  async function handleMove(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= categories.length || reordering) {
      return;
    }

    const reordered = [...categories];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);
    await applyReorder(reordered);
  }

  function handleDragStart(index: number) {
    setDragIndex(index);
    setDropIndex(index);
  }

  function handleDragOver(event: React.DragEvent, index: number) {
    event.preventDefault();
    if (dragIndex === null || reordering) {
      return;
    }
    setDropIndex(index);
  }

  async function handleDrop(index: number) {
    if (dragIndex === null || dragIndex === index || reordering) {
      setDragIndex(null);
      setDropIndex(null);
      return;
    }

    const reordered = [...categories];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(index, 0, moved);
    setDragIndex(null);
    setDropIndex(null);
    await applyReorder(reordered);
  }

  function handleDragEnd() {
    setDragIndex(null);
    setDropIndex(null);
  }

  async function handleAdd() {
    if (!newName.trim()) {
      return;
    }

    const trimmedName = newName.trim();
    const tempId = createTempCategoryId();
    const order = categories.length;
    const { category, flatCategory } = buildOptimisticCategory(tempId, trimmedName, newIcon, order);

    await runOptimistic({
      snapshot: () => captureMonthViewState(monthView),
      apply: () => {
        addCategory(category, flatCategory);
        setCategories((prev) => [...prev, toEditable(flatCategory)]);
        setNewName("");
        setNewIcon("category");
      },
      mutate: async () => {
        const created = await createCategory({ name: trimmedName, icon: newIcon });
        replaceCategoryId(tempId, { ...created, lineItems: [] }, created);
        setCategories((prev) =>
          prev.map((entry) => (entry.id === tempId ? toEditable(created) : entry)),
        );
      },
      reconcile: () => backgroundReconcile(router),
      rollback: restoreFromSnapshot,
      successMessage: t("categories.categoryAdded"),
    });
  }

  async function handleDelete(cat: EditableCategory) {
    await runOptimistic({
      snapshot: () => captureMonthViewState(monthView),
      apply: () => {
        removeCategory(cat.id);
        setCategories((prev) => prev.filter((entry) => entry.id !== cat.id));
        setDeletingCategory(null);
      },
      mutate: () => deleteCategory(cat.id),
      reconcile: () => backgroundReconcile(router),
      rollback: (snapshot) => {
        restoreFromSnapshot(snapshot);
        setDeletingCategory(null);
      },
      successMessage: t("categories.categoryDeleted"),
    });
  }

  function hasPendingChanges(): boolean {
    if (saveTimers.current.size > 0) {
      return true;
    }
    return categories.some(isDirty);
  }

  function requestClose(): boolean {
    if (hasPendingChanges()) {
      setUnsavedConfirmOpen(true);
      return false;
    }
    onRequestClose?.();
    return true;
  }

  useImperativeHandle(ref, () => ({ requestClose }), [categories]);

  function discardAndClose() {
    for (const timer of saveTimers.current.values()) {
      clearTimeout(timer);
    }
    saveTimers.current.clear();
    setCategories(sortToEditable(monthView.flatCategories));
    setUnsavedConfirmOpen(false);
    onRequestClose?.();
  }

  const rowDisabled = reordering || addLoading;

  return (
    <>
      <div className="space-y-4">
        <div>
          <p className="text-display mb-2 text-xs">{t("categories.addCategory")}</p>
          <div className="inventory-slot flex flex-wrap items-center gap-2 p-2">
            <CategoryIconPicker
              value={newIcon}
              onChange={setNewIcon}
              disabled={rowDisabled}
              label={t("categories.pickIcon")}
            />
            <Input
              className="min-w-0 flex-1"
              placeholder={t("categories.categoryName")}
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void handleAdd();
                }
              }}
              disabled={rowDisabled}
            />
            <Button
              type="button"
              variant="default"
              size="sm"
              className="pressable focus-ring gap-1"
              onClick={() => void handleAdd()}
              disabled={rowDisabled || !newName.trim()}
            >
              {addLoading ? <Spinner className="size-4" /> : <Icon name="add" size="xs" />}
              {t("categories.add")}
            </Button>
          </div>
        </div>

        <p className="text-muted-finance text-body text-sm">{t("categories.reorderHint")}</p>

        <ul className="space-y-2" aria-label={t("categories.manageTitle")}>
          {categories.map((cat, index) => {
            const status = saveStatus[cat.id] ?? "idle";
            const isDragging = dragIndex === index;
            const isDropTarget = dropIndex === index && dragIndex !== null && dragIndex !== index;
            const rowSaving = status === "saving";

            return (
              <li
                key={cat.id}
                className={`interactive-row inventory-slot p-2 ${
                  isDragging ? "category-manager-row-dragging" : ""
                } ${isDropTarget ? "ring-2 ring-ring" : ""}`}
                onDragOver={(event) => handleDragOver(event, index)}
                onDrop={() => void handleDrop(index)}
              >
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    draggable={!rowDisabled}
                    className="pressable focus-ring hidden shrink-0 cursor-grab p-1 active:cursor-grabbing sm:block"
                    aria-label={t("categories.dragToReorder")}
                    disabled={rowDisabled}
                    onDragStart={() => handleDragStart(index)}
                    onDragEnd={handleDragEnd}
                  >
                    <Icon name="dragHandle" size="sm" />
                  </button>

                  <div className="flex shrink-0 items-center gap-1 sm:hidden">
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      className="pressable focus-ring h-auto p-1"
                      onClick={() => void handleMove(index, -1)}
                      disabled={rowDisabled || index === 0}
                      aria-label={t("categories.moveUp")}
                    >
                      <Icon name="arrowUp" size="xs" />
                    </Button>
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      className="pressable focus-ring h-auto p-1"
                      onClick={() => void handleMove(index, 1)}
                      disabled={rowDisabled || index === categories.length - 1}
                      aria-label={t("categories.moveDown")}
                    >
                      <Icon name="arrowDown" size="xs" />
                    </Button>
                  </div>

                  <CategoryIconPicker
                    value={cat.draftIcon}
                    onChange={(icon) => updateDraft(cat.id, { draftIcon: icon })}
                    disabled={rowDisabled || rowSaving}
                    label={`${t("categories.pickIcon")}: ${cat.name}`}
                  />

                  <Input
                    className="min-w-0 flex-1"
                    value={cat.draftName}
                    onChange={(event) => updateDraft(cat.id, { draftName: event.target.value })}
                    disabled={rowDisabled || rowSaving}
                    aria-label={cat.name}
                  />

                  <Select
                    value={toBudgetGroupOption(cat.draftBudgetGroup)}
                    onValueChange={(value) =>
                      updateDraft(cat.id, {
                        draftBudgetGroup: fromBudgetGroupOption(value as BudgetGroupOption),
                      })
                    }
                    disabled={rowDisabled || rowSaving}
                  >
                    <SelectTrigger className="w-[9.5rem] shrink-0" aria-label={t("categories.budgetGroup")}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">{t("categories.budgetGroupDefault")}</SelectItem>
                      <SelectItem value="essential">{t("categories.budgetGroupEssential")}</SelectItem>
                      <SelectItem value="non_essential">{t("categories.budgetGroupNonEssential")}</SelectItem>
                      <SelectItem value="investment">{t("categories.budgetGroupInvestment")}</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="flex shrink-0 items-center gap-2">
                    {status === "saving" && (
                      <Badge
                        font="normal"
                        variant="outline"
                        className="bg-planned-subtle h-4 px-1.5 text-[0.625rem] text-planned"
                      >
                        <span className="flex items-center gap-1">
                          <Icon name="repeat" size="xs" />
                          {t("categories.pendingBadge")}
                        </span>
                      </Badge>
                    )}
                    {status === "saved" && (
                      <Badge
                        font="normal"
                        variant="outline"
                        className="bg-income-subtle h-4 px-1.5 text-[0.625rem] text-income"
                      >
                        <span className="flex items-center gap-1">
                          <Icon name="save" size="xs" />
                          {t("categories.savedBadge")}
                        </span>
                      </Badge>
                    )}
                    {status === "error" && (
                      <Badge
                        font="normal"
                        variant="outline"
                        className="bg-expense-subtle h-4 px-1.5 text-[0.625rem] text-expense"
                      >
                        <span className="flex items-center gap-1">
                          <Icon name="alert" size="xs" colorClass="text-destructive" />
                          {t("common.somethingWrong")}
                        </span>
                      </Badge>
                    )}

                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      className="pressable focus-ring h-auto p-1"
                      onClick={() => setDeletingCategory(cat)}
                      disabled={rowDisabled || rowSaving}
                      aria-label={t("categories.deleteCategory")}
                    >
                      <Icon name="delete" size="xs" colorClass="text-expense" />
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {onRequestClose && (
        <ConfirmDialog
          open={unsavedConfirmOpen}
          onOpenChange={setUnsavedConfirmOpen}
          title={t("categories.unsavedChanges")}
          description={t("categories.unsavedChangesDescription")}
          confirmLabel={t("common.discard")}
          loading={false}
          onConfirm={discardAndClose}
        />
      )}

      <ConfirmDialog
        open={deletingCategory !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setDeletingCategory(null);
          }
        }}
        title={t("categories.deleteCategory")}
        description={
          deletingCategory
            ? t("categories.deleteCategoryDescription", { name: deletingCategory.name })
            : undefined
        }
        loading={addLoading}
        onConfirm={() => {
          if (deletingCategory) {
            void handleDelete(deletingCategory);
          }
        }}
      />
    </>
  );
});