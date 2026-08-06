"use client";

import { useRouter } from "next/navigation";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { CategoryIconPicker } from "@/components/CategoryIconPicker";
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
import { resolveCategoryIconKey } from "@/lib/categoryIcons";
import {
  captureMonthViewState,
  useMonthView,
  useMonthViewActions,
} from "@/lib/MonthViewProvider";
import { useTranslation } from "@/lib/i18n";
import { useMutationFeedback } from "@/lib/useMutationFeedback";

interface EditableCategory extends FlatCategory {
  draftName: string;
  draftIcon: string;
  draftBudgetGroup: BudgetGroup | null;
}

type BudgetGroupOption = "default" | BudgetGroup;

function toBudgetGroupOption(budgetGroup: BudgetGroup | null): BudgetGroupOption {
  return budgetGroup ?? "default";
}

function fromBudgetGroupOption(option: BudgetGroupOption): BudgetGroup | null {
  return option === "default" ? null : option;
}

function eventValue(event: { target: EventTarget | null }): string {
  return (event.target as HTMLInputElement & { value: string }).value;
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

function toEditable(cat: FlatCategory): EditableCategory {
  return {
    ...cat,
    draftName: cat.name,
    draftIcon: resolveCategoryIconKey(cat.icon),
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
    cat.draftIcon !== resolveCategoryIconKey(cat.icon) ||
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
  const [newIcon, setNewIcon] = useState("category");
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
      <div className="wa-stack wa-gap-l">
        <wa-card>
          <div className="wa-stack wa-gap-m">
            <p className="wa-heading-xs">{t("categories.addCategory")}</p>
            <div className="wa-stack wa-gap-s">
              <CategoryIconPicker
                value={newIcon}
                onChange={setNewIcon}
                disabled={rowDisabled}
                label={t("categories.pickIcon")}
              />
              <div className="wa-cluster wa-gap-s">
                <wa-input
                  style={{ flex: 1, minWidth: 0 }}
                  placeholder={t("categories.categoryName")}
                  value={newName}
                  disabled={rowDisabled || undefined}
                  onInput={(e) => setNewName(eventValue(e))}
                  onKeyDown={(event: React.KeyboardEvent) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void handleAdd();
                    }
                  }}
                ></wa-input>
                <wa-button
                  type="button"
                  variant="brand"
                  disabled={rowDisabled || !newName.trim() || undefined}
                  onClick={() => void handleAdd()}
                >
                  {addLoading ? (
                    <wa-spinner slot="start" style={{ fontSize: "0.875rem" }}></wa-spinner>
                  ) : (
                    <wa-icon slot="start" name="plus"></wa-icon>
                  )}
                  {t("categories.add")}
                </wa-button>
              </div>
            </div>
          </div>
        </wa-card>

        <p className="wa-caption-m wa-color-text-quiet">{t("categories.reorderHint")}</p>

        <ul
          className="wa-stack wa-gap-s"
          style={{ listStyle: "none", margin: 0, padding: 0 }}
          aria-label={t("categories.manageTitle")}
        >
          {categories.map((cat, index) => {
            const status = saveStatus[cat.id] ?? "idle";
            const isDragging = dragIndex === index;
            const isDropTarget = dropIndex === index && dragIndex !== null && dragIndex !== index;
            const rowSaving = status === "saving";

            return (
              <li
                key={cat.id}
                className={`list-row${isDragging ? " category-drag-opacity" : ""}`}
                style={{
                  flexDirection: "column",
                  alignItems: "stretch",
                  outline: isDropTarget
                    ? "var(--wa-border-width-l) solid var(--wa-color-focus)"
                    : undefined,
                }}
                onDragOver={(event) => handleDragOver(event, index)}
                onDrop={() => void handleDrop(index)}
              >
                <div className="wa-cluster wa-gap-s wa-align-items-center">
                  <wa-button
                    type="button"
                    appearance="plain"
                    size="s"
                    draggable={!rowDisabled}
                    className="wa-desktop-only"
                    aria-label={t("categories.dragToReorder")}
                    disabled={rowDisabled || undefined}
                    onDragStart={() => handleDragStart(index)}
                    onDragEnd={handleDragEnd}
                  >
                    <wa-icon name="grip-vertical"></wa-icon>
                  </wa-button>

                  <div className="wa-cluster wa-gap-2xs wa-mobile-only">
                    <wa-button
                      type="button"
                      appearance="plain"
                      size="s"
                      onClick={() => void handleMove(index, -1)}
                      disabled={rowDisabled || index === 0 || undefined}
                      aria-label={t("categories.moveUp")}
                    >
                      <wa-icon name="arrow-up"></wa-icon>
                    </wa-button>
                    <wa-button
                      type="button"
                      appearance="plain"
                      size="s"
                      onClick={() => void handleMove(index, 1)}
                      disabled={rowDisabled || index === categories.length - 1 || undefined}
                      aria-label={t("categories.moveDown")}
                    >
                      <wa-icon name="arrow-down"></wa-icon>
                    </wa-button>
                  </div>

                  <CategoryIconPicker
                    value={cat.draftIcon}
                    onChange={(icon) => updateDraft(cat.id, { draftIcon: icon })}
                    disabled={rowDisabled || rowSaving}
                    label={`${t("categories.pickIcon")}: ${cat.name}`}
                  />

                  <wa-input
                    style={{ flex: 1, minWidth: 0 }}
                    value={cat.draftName}
                    disabled={rowDisabled || rowSaving || undefined}
                    aria-label={cat.name}
                    onInput={(e) => updateDraft(cat.id, { draftName: eventValue(e) })}
                  ></wa-input>

                  <wa-select
                    style={{ width: "9.5rem", flexShrink: 0 }}
                    value={toBudgetGroupOption(cat.draftBudgetGroup)}
                    disabled={rowDisabled || rowSaving || undefined}
                    aria-label={t("categories.budgetGroup")}
                    onChange={(e: Event) =>
                      updateDraft(cat.id, {
                        draftBudgetGroup: fromBudgetGroupOption(eventValue(e) as BudgetGroupOption),
                      })
                    }
                  >
                    <wa-option value="default">{t("categories.budgetGroupDefault")}</wa-option>
                    <wa-option value="essential">{t("categories.budgetGroupEssential")}</wa-option>
                    <wa-option value="non_essential">{t("categories.budgetGroupNonEssential")}</wa-option>
                    <wa-option value="investment">{t("categories.budgetGroupInvestment")}</wa-option>
                  </wa-select>

                  <div className="wa-cluster wa-gap-s wa-align-items-center">
                    {status === "saving" && (
                      <wa-badge appearance="outlined" variant="warning">
                        {t("categories.pendingBadge")}
                      </wa-badge>
                    )}
                    {status === "saved" && (
                      <wa-badge appearance="outlined" variant="success">
                        {t("categories.savedBadge")}
                      </wa-badge>
                    )}
                    {status === "error" && (
                      <wa-badge appearance="outlined" variant="danger">
                        {t("common.somethingWrong")}
                      </wa-badge>
                    )}

                    <wa-button
                      type="button"
                      appearance="plain"
                      size="s"
                      variant="danger"
                      onClick={() => setDeletingCategory(cat)}
                      disabled={rowDisabled || rowSaving || undefined}
                      aria-label={t("categories.deleteCategory")}
                    >
                      <wa-icon name="trash"></wa-icon>
                    </wa-button>
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
