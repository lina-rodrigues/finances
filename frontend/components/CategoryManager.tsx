"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
  const { loading, run } = useMutationFeedback();
  const [open, setOpen] = useState(false);
  const [categories, setCategories] = useState<EditableCategory[]>(() =>
    sortToEditable(initialCategories),
  );
  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState<IconName>("category");

  // router.refresh() re-runs the server page, which feeds fresh categories
  // back through initialCategories and this effect.
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
      { successMessage: "Category updated" },
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
      { successMessage: "Categories reordered" },
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
      { successMessage: "Category created" },
    );
  }

  async function handleDelete(cat: EditableCategory) {
    if (!confirm(`Delete category "${cat.name}"?`)) return;

    await run(
      async () => {
        await deleteCategory(cat.id);
        router.refresh();
      },
      { successMessage: "Category deleted" },
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
        Manage
      </Button>
      <DialogContent className="max-h-[85dvh] w-[calc(100%-2rem)] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage categories</DialogTitle>
        </DialogHeader>
        <p className="text-muted-finance text-body text-sm">
          Rename, pick icons, reorder, or add categories.
        </p>

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
                  aria-label="Move up"
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
                  aria-label="Move down"
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
                Save
              </Button>

              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="pressable focus-ring"
                onClick={() => handleDelete(cat)}
                disabled={loading}
                aria-label={`Delete ${cat.name}`}
              >
                <Icon name="delete" size="xs" />
              </Button>
            </div>
          ))}
        </div>

        <hr className="my-4 border-t-2 border-foreground/20" />
        <p className="text-display mb-2 text-xs">Add category</p>

        <div className="flex flex-wrap items-center gap-2">
          <Icon name={newIcon} size="sm" />
          <Input
            className="min-w-0 flex-1"
            placeholder="Category name"
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
            Add
          </Button>
        </div>

        <DialogFooter>
          <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
