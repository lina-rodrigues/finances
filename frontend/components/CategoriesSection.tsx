"use client";

import Image from "next/image";
import { useState } from "react";
import { LineItemDialog } from "@/components/LineItemDialog";
import { CategoryManager } from "@/components/CategoryManager";
import { CategorySection } from "@/components/CategorySection";
import { Icon } from "@/components/Icon";
import { Alert, AlertDescription } from "@/components/ui/pixelact-ui/alert";
import { Button } from "@/components/ui/pixelact-ui/button";
import { Card, CardContent } from "@/components/ui/pixelact-ui/card";
import { type Category, type LineItem } from "@/lib/api";
import { useMonthView } from "@/lib/MonthViewProvider";
import { useTranslation } from "@/lib/i18n";

export function CategoriesSection() {
  const { t } = useTranslation();
  const { month, categories, uncategorized, flatCategories } = useMonthView();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [selectedItem, setSelectedItem] = useState<LineItem | null>(null);
  const [initialCategoryName, setInitialCategoryName] = useState<string | undefined>();

  function openAddItem(categoryName?: string) {
    setDialogMode("create");
    setSelectedItem(null);
    setInitialCategoryName(categoryName);
    setDialogOpen(true);
  }

  function openEditItem(item: LineItem) {
    setDialogMode("edit");
    setSelectedItem(item);
    setDialogOpen(true);
  }

  const uncategorizedLabel = t("common.uncategorized");

  const uncategorizedCategory: Category | null =
    uncategorized.length > 0
      ? {
          id: "__uncategorized__",
          name: uncategorizedLabel,
          order: Number.MAX_SAFE_INTEGER,
          icon: "category",
          lineItems: uncategorized,
        }
      : null;

  const showCategoryGrid = categories.length > 0 || uncategorizedCategory !== null;

  return (
    <section>
      <div className="mb-4 flex flex-col gap-3 px-1 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-display text-sm">{t("categories.title")}</h2>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="default"
            size="sm"
            className="pressable focus-ring hidden gap-1 sm:inline-flex"
            data-testid="add-item-trigger-header"
            onClick={() => openAddItem()}
          >
            <Icon name="add" size="xs" />
            {t("categories.add")}
          </Button>
          <CategoryManager />
        </div>
      </div>

      {!showCategoryGrid ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
            <Image src="/assets/mascot-piggy.svg" alt="" width={64} height={64} aria-hidden />
            <Alert className="max-w-sm">
              <AlertDescription className="text-body">{t("categories.empty")}</AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3 lg:grid lg:grid-cols-2 lg:items-start lg:gap-3 lg:space-y-0">
          {categories.map((category, index) => (
            <CategorySection
              key={category.id}
              category={category}
              yearMonth={month.yearMonth}
              onAddItem={() => openAddItem(category.name)}
              onEditItem={openEditItem}
              addItemTestId={index === 0 ? "add-item-trigger-category" : undefined}
            />
          ))}
          {uncategorizedCategory && (
            <CategorySection
              key={uncategorizedCategory.id}
              category={uncategorizedCategory}
              yearMonth={month.yearMonth}
              onAddItem={() => openAddItem(uncategorizedLabel)}
              onEditItem={openEditItem}
            />
          )}
        </div>
      )}

      <LineItemDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode={dialogMode}
        categories={flatCategories}
        yearMonth={month.yearMonth}
        initialCategoryName={initialCategoryName}
        item={selectedItem ?? undefined}
      />
    </section>
  );
}
