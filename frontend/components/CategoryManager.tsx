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
  type FlatCategory,
} from "@/lib/api";
import {
  categoryIcons,
  formatIconLabel,
  resolveCategoryIcon,
  type IconName,
} from "@/lib/icons";
import { useTranslation } from "@/lib/i18n";
import { useMutationFeedback } from "@/lib/useMutationFeedback";

interface CategoryManagerProps {
  initialCategories: FlatCategory[];
}

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

export function CategoryManager({ initialCategories }: CategoryManagerProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const { loading, run } = useMutationFeedback();
  const [open, setOpen] = useState(false);
  const [categories, setCategories] = useState<EditableCategory[]>(() =>
    sortToEditable(initialCategories),
  );
  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState<IconName>("category");
  const [deletingCategory, setDeletingCategory] = useState<EditableCategory | null>(null);

  useEffect(() => {
    setCategories(sortToEditable(initialCategories));
  }, [initialCategories]);

  async function handleSave(cat: EditableCategory) {
    if (!cat.draftName.trim()) return;

    await run(
      async () => {
        await updateCategory(cat.id, {
          name: cat.draftName.trim(),
          icon: cat.draftIcon,
        });
        router.refresh();
      },
      { successMessage: t("categories.categoryUpdated") },
    );
  }

  async function handleMove(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= categories.length) return;

    const reordered = [...categories];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);

    const items = reordered.map((cat, order) => ({ id: cat.id, order }));
    setCategories(reordered);

    await run(
      async () => {
        await reorderCategories(items);
        router.refresh();
      },
      { successMessage: t("categories.categoryReordered") },
    );
  }

  async function handleAdd() {
    if (!newName.trim()) return;

    await run(
      async () => {
        await createCategory({ name: newName.trim(), icon: newIcon });
        setNewName("");
        setNewIcon("category");
        router.refresh();
      },
      { successMessage: t("categories.categoryAdded") },
    );
  }

  async function handleDelete(cat: EditableCategory) {
    await run(
      async () => {
        await deleteCategory(cat.id);
        setDeletingCategory(null);
        router.refresh();
      },
      { successMessage: t("categories.categoryDeleted") },
    );
  }

  function updateDraft(id: string, patch: Partial<Pick<EditableCategory, "draftName" | "draftIcon">>) {
    setCategories((prev) =>
      prev.map((cat) => (cat.id === id ? { ...cat, ...patch } : cat)),
    );
  }

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
                  onClick={() => handleMove(index, -1)}
                  disabled={loading || index === 0}
                  aria-label={t("categories.moveUp")}
                >
                  <Icon name="arrowUp" size="xs" />
                </Button>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="pressable focus-ring h-auto p-1"
                  onClick={() => handleMove(index, 1)}
                  disabled={loading || index === categories.length - 1}
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
