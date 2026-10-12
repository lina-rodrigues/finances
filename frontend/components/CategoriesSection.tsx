"use client";

import Link from "next/link";
import { useState } from "react";
import { LineItemDialogPanels, useLineItemDialogHost } from "@/components/LineItemDialogHost";
import { CategorySection } from "@/components/CategorySection";
import { EntryListView } from "@/components/EntryListView";
import { PageTitle } from "@/components/PageTitle";
import { categoryManagePath, type Category } from "@/lib/api";
import { useMonthView } from "@/lib/MonthViewProvider";
import { useAuth } from "@/lib/AuthProvider";
import { useTranslation } from "@/lib/i18n";

type DetailsView = "category" | "list";

export function CategoriesSection() {
  const { t } = useTranslation();
  const { readOnly, loading } = useAuth();
  const { month, categories, uncategorized, flatCategories } = useMonthView();
  const host = useLineItemDialogHost({ flatCategories, yearMonth: month.yearMonth });
  const manageCategoriesHref = categoryManagePath(month.yearMonth);
  const uncategorizedLabel = t("common.uncategorized");
  const [view, setView] = useState<DetailsView>("category");

  const uncategorizedCategory: Category | null =
    uncategorized.length > 0
      ? {
          id: "__uncategorized__",
          name: uncategorizedLabel,
          order: Number.MAX_SAFE_INTEGER,
          icon: "category",
          budgetGroup: null,
          lineItems: uncategorized,
        }
      : null;

  const showCategoryGrid = categories.length > 0 || uncategorizedCategory !== null;
  const addAction =
    loading || readOnly ? null : showCategoryGrid ? (
      <wa-button
        type="button"
        variant="brand"
        data-testid="add-item-trigger-fab-categories"
        onClick={() => host.openCreate()}
      >
        <wa-icon slot="start" name="plus"></wa-icon>
        {t("categories.addItem")}
      </wa-button>
    ) : (
      <Link href={manageCategoriesHref}>
        <wa-button type="button" variant="brand" data-testid="add-item-trigger-fab-categories">
          <wa-icon slot="start" name="plus"></wa-icon>
          {t("categories.addCategory")}
        </wa-button>
      </Link>
    );

  return (
    <>
      <div className="wa-stack wa-gap-l">
        <PageTitle
          actions={
            <div className="wa-cluster wa-gap-s" style={{ justifyContent: "flex-end" }}>
              {addAction}
              <wa-button-group label={t("categories.viewLabel")}>
                <wa-button
                  type="button"
                  variant={view === "category" ? "brand" : undefined}
                  appearance={view === "category" ? undefined : "outlined"}
                  aria-pressed={view === "category"}
                  data-testid="details-view-category"
                  onClick={() => setView("category")}
                >
                  {t("categories.viewCategory")}
                </wa-button>
                <wa-button
                  type="button"
                  variant={view === "list" ? "brand" : undefined}
                  appearance={view === "list" ? undefined : "outlined"}
                  aria-pressed={view === "list"}
                  data-testid="details-view-list"
                  onClick={() => setView("list")}
                >
                  {t("categories.viewList")}
                </wa-button>
              </wa-button-group>
            </div>
          }
        >
          {t("nav.categories")}
        </PageTitle>

        {!showCategoryGrid ? (
          <wa-card>
            <div className="wa-stack wa-gap-m">
              <wa-callout variant="neutral">
                <wa-icon slot="icon" name="folder-open"></wa-icon>
                <strong>{t("categories.emptyTitle")}</strong>
                <div className="wa-caption-m wa-color-text-quiet">{t("categories.emptyDescription")}</div>
              </wa-callout>
              {loading || readOnly ? null : (
                <Link href={manageCategoriesHref}>
                  <wa-button type="button" variant="brand">
                    <wa-icon slot="start" name="plus"></wa-icon>
                    {t("categories.addCategory")}
                  </wa-button>
                </Link>
              )}
            </div>
          </wa-card>
        ) : view === "list" ? (
          <EntryListView
            categories={categories}
            uncategorized={uncategorized}
            uncategorizedLabel={uncategorizedLabel}
            handlers={host.handlers}
          />
        ) : (
          <div
            className="wa-grid wa-gap-m"
            style={{ gridTemplateColumns: "repeat(auto-fit, minmax(20rem, 1fr))" }}
          >
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
      </div>

      <LineItemDialogPanels host={host} />
    </>
  );
}
