"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Icon } from "@/components/Icon";
import { Button } from "@/components/ui/pixelact-ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/pixelact-ui/dialog";
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
  type Category,
  type FlatCategory,
} from "@/lib/api";
import { backgroundReconcile } from "@/lib/backgroundReconcile";
import {
  captureMonthViewState,
  useMonthView,
  useMonthViewActions,
} from "@/lib/MonthViewProvider";
import {
  categoryIcons,
  formatIconLabel,
  resolveCategoryIcon,
  type IconName,
} from "@/lib/icons";
import { buildOptimisticCategory, createTempCategoryId } from "@/lib/categoryMappers";
import { useTranslation } from "@/lib/i18n";
import { useMutationFeedback } from "@/lib/useMutationFeedback";

interface EditableCategory extends FlatCategory {
  draftName: string;
  draftIcon: IconName;
}

function toEditable(cat: FlatCategory): EditableCategory {
  return {
    ...cat,
    draftName: cat.name,
    draftIcon: resolveCategoryIcon(cat.icon),
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

function IconSelect({
  value,
  onChange,
  disabled,
  label,
}: {
  value: IconName;
  onChange: (icon: IconName) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as IconName)} disabled={disabled}>
      <SelectTrigger className="w-36" size="sm" aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {categoryIcons.map((icon) => (
          <SelectItem key={icon} value={icon}>
            {formatIconLabel(icon)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function CategoryManager() {
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
  const { loading, runOptimistic } = useMutationFeedback();
  const [open, setOpen] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [categories, setCategories] = useState<EditableCategory[]>(() =>
    sortToEditable(monthView.flatCategories),
  );
  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState<IconName>("category");
  const [deletingCategory, setDeletingCategory] = useState<EditableCategory | null>(null);

  useEffect(() => {
    setCategories(sortToEditable(monthView.flatCategories));
  }, [monthView.flatCategories]);

  function restoreFromSnapshot(snapshot: ReturnType<typeof captureMonthViewState>) {
    setFromServer(snapshot);
    setCategories(sortToEditable(snapshot.flatCategories));
  }

  async function handleSave(cat: EditableCategory) {
    if (!cat.draftName.trim()) return;

    const trimmedName = cat.draftName.trim();
    await runOptimistic({
      snapshot: () => captureMonthViewState(monthView),
      apply: () => {
        patchCategory(cat.id, { name: trimmedName, icon: cat.draftIcon });
        setCategories((prev) =>
          prev.map((entry) =>
            entry.id === cat.id
              ? {
                  ...entry,
                  name: trimmedName,
                  icon: cat.draftIcon,
                  draftName: trimmedName,
                  draftIcon: cat.draftIcon,
                }
              : entry,
          ),
        );
      },
      mutate: () => updateCategory(cat.id, { name: trimmedName, icon: cat.draftIcon }),
      reconcile: () => backgroundReconcile(router),
      rollback: restoreFromSnapshot,
      successMessage: t("categories.categoryUpdated"),
    });
  }

  async function handleMove(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= categories.length) return;

    const reordered = [...categories];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);

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
      rollback: (snapshot) => {
        restoreFromSnapshot(snapshot);
      },
      successMessage: t("categories.categoryReordered"),
    });
    setReordering(false);
  }

  async function handleAdd() {
    if (!newName.trim()) return;

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
        replaceCategoryId(
          tempId,
          { ...created, lineItems: [] },
          created,
        );
        setCategories((prev) =>
          prev.map((entry) =>
            entry.id === tempId
              ? toEditable(created)
              : entry,
          ),
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

  function updateDraft(id: string, patch: Partial<Pick<EditableCategory, "draftName" | "draftIcon">>) {
    setCategories((prev) =>
      prev.map((cat) => (cat.id === id ? { ...cat, ...patch } : cat)),
    );
  }

  const moveDisabled = loading || reordering;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        type="button"
        variant="default"
        size="sm"
        className="pressable focus-ring gap-1"
        onClick={() => setOpen(true)}
      >
        <Icon name="edit" size="xs" />
        {t("categories.manage")}
      </Button>
      <DialogContent className="max-h-[85dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("categories.manageTitle")}</DialogTitle>
        </DialogHeader>
        <p className="text-muted-finance text-body text-sm">{t("categories.manageHint")}</p>

        <div className="mt-4 max-h-[50vh] space-y-2 overflow-y-auto">
          {categories.map((cat, index) => (
            <div
              key={cat.id}
              className="interactive-row inventory-slot flex flex-wrap items-center gap-2 p-2"
            >
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="pressable focus-ring h-auto p-1"
                  onClick={() => void handleMove(index, -1)}
                  disabled={moveDisabled || index === 0}
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
                  disabled={moveDisabled || index === categories.length - 1}
                  aria-label={t("categories.moveDown")}
                >
                  <Icon name="arrowDown" size="xs" />
                </Button>
              </div>

              <Icon name={cat.draftIcon} size="sm" />

              <Input
                className="min-w-0 flex-1"
                value={cat.draftName}
                onChange={(e) => updateDraft(cat.id, { draftName: e.target.value })}
                disabled={loading}
              />

              <IconSelect
                value={cat.draftIcon}
                onChange={(icon) => updateDraft(cat.id, { draftIcon: icon })}
                disabled={loading}
                label={`Icon for ${cat.name}`}
              />

              <Button
                type="button"
                variant="default"
                size="sm"
                className="pressable focus-ring gap-1"
                onClick={() => handleSave(cat)}
                disabled={
                  loading ||
                  !cat.draftName.trim() ||
                  (cat.draftName === cat.name && cat.draftIcon === resolveCategoryIcon(cat.icon))
                }
              >
                {loading ? <Spinner className="size-4" /> : <Icon name="save" size="xs" />}
                {t("common.save")}
              </Button>

              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="pressable focus-ring"
                onClick={() => setDeletingCategory(cat)}
                disabled={loading}
                aria-label={t("categories.deleteCategory")}
              >
                <Icon name="delete" size="xs" />
              </Button>
            </div>
          ))}
        </div>

        <hr className="my-4 border-t-2 border-foreground/20" />
        <p className="text-display mb-2 text-xs">{t("categories.addCategory")}</p>

        <div className="flex flex-wrap items-center gap-2">
          <Icon name={newIcon} size="sm" />
          <Input
            className="min-w-0 flex-1"
            placeholder={t("categories.categoryName")}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            disabled={loading}
          />
          <IconSelect
            value={newIcon}
            onChange={setNewIcon}
            disabled={loading}
            label="Icon for new category"
          />
          <Button
            type="button"
            variant="default"
            size="sm"
            className="pressable focus-ring gap-1"
            onClick={handleAdd}
            disabled={loading || !newName.trim()}
          >
            {loading ? <Spinner className="size-4" /> : <Icon name="add" size="xs" />}
            {t("categories.add")}
          </Button>
        </div>

        <DialogFooter>
          <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(false)}>
            {t("categories.close")}
          </Button>
        </DialogFooter>

        <ConfirmDialog
          open={deletingCategory !== null}
          onOpenChange={(isOpen) => {
            if (!isOpen) setDeletingCategory(null);
          }}
          title={t("categories.deleteCategory")}
          description={
            deletingCategory
              ? t("categories.deleteCategoryDescription", { name: deletingCategory.name })
              : undefined
          }
          loading={loading}
          onConfirm={() => {
            if (deletingCategory) void handleDelete(deletingCategory);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
