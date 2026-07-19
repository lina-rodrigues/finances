"use client";

import Image from "next/image";
import Link from "next/link";
import { LineItemDialogPanels, useLineItemDialogHost } from "@/components/LineItemDialogHost";
import { CategorySection } from "@/components/CategorySection";
import { Icon } from "@/components/Icon";
import { Button } from "@/components/ui/pixelact-ui/button";
import { Card, CardContent } from "@/components/ui/pixelact-ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/pixelact-ui/empty";
import { categoryManagePath, type Category } from "@/lib/api";
import { useMonthView } from "@/lib/MonthViewProvider";
import { useTranslation } from "@/lib/i18n";

export function CategoriesSection() {
  const { t } = useTranslation();
  const { month, categories, uncategorized, flatCategories } = useMonthView();
  const host = useLineItemDialogHost({ flatCategories, yearMonth: month.yearMonth });
  const manageCategoriesHref = categoryManagePath(month.yearMonth);
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
    <>
      {!showCategoryGrid ? (
        <Card>
          <CardContent className="p-0">
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Image src="/assets/mascot-piggy.svg" alt="" width={48} height={48} aria-hidden />
                </EmptyMedia>
                <EmptyTitle>{t("categories.emptyTitle")}</EmptyTitle>
                <EmptyDescription>{t("categories.emptyDescription")}</EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button
                  variant="default"
                  size="sm"
                  className="pressable focus-ring gap-1"
                  asChild
                >
                  <Link href={manageCategoriesHref}>
                    <Icon name="add" size="xs" colorClass="text-primary-foreground" />
                    {t("categories.addCategory")}
                  </Link>
                </Button>
              </EmptyContent>
            </Empty>
          </CardContent>
        </Card>
      ) : (
        <div className="responsive-card-columns">
          {categories.map((category, index) => (
            <CategorySection
              key={category.id}
              category={category}
              onAddItem={() => host.openCreate(category.name)}
              handlers={host.handlers}
              addItemTestId={index === 0 ? "add-item-trigger-category" : undefined}
            />
          ))}
          {uncategorizedCategory && (
            <CategorySection
              key={uncategorizedCategory.id}
              category={uncategorizedCategory}
              onAddItem={() => host.openCreate(uncategorizedLabel)}
              handlers={host.handlers}
            />
          )}
        </div>
      )}

      {showCategoryGrid ? (
        <Button
          type="button"
          variant="default"
          size="lg"
          className="add-item-fab add-item-fab--persistent pressable focus-ring box-shadow-margin"
          data-testid="add-item-trigger-fab-categories"
          aria-label={t("categories.addItem")}
          onClick={() => host.openCreate()}
        >
          <Icon name="add" size="md" colorClass="text-primary-foreground" />
        </Button>
      ) : (
        <Button
          variant="default"
          size="lg"
          className="add-item-fab add-item-fab--persistent pressable focus-ring box-shadow-margin"
          data-testid="add-item-trigger-fab-categories"
          asChild
        >
          <Link href={manageCategoriesHref} aria-label={t("categories.addCategory")}>
            <Icon name="add" size="md" colorClass="text-primary-foreground" />
          </Link>
        </Button>
      )}

      <LineItemDialogPanels host={host} />
    </>
  );
}
