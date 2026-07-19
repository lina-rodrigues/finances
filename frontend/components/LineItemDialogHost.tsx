"use client";

import { AddEntryDialog } from "@/components/AddEntryDialog";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { LineItemDetailDialog } from "@/components/LineItemDetailDialog";
import { LineItemDialog } from "@/components/LineItemDialog";
import { RepeatScopeDialog } from "@/components/RepeatScopeDialog";
import { useLineItemDialogHost } from "@/lib/useLineItemDialogHost";
import { useTranslation } from "@/lib/i18n";

type LineItemDialogHostState = ReturnType<typeof useLineItemDialogHost>;

interface LineItemDialogPanelsProps {
  host: LineItemDialogHostState;
}

export function LineItemDialogPanels({ host }: LineItemDialogPanelsProps) {
  const { t } = useTranslation();

  return (
    <>
      <LineItemDetailDialog
        item={host.detailItem}
        open={host.detailItem !== null}
        onOpenChange={(open) => {
          if (!open) {
            host.setDetailItem(null);
          }
        }}
        handlers={host.handlers}
        paying={host.payingItemId === host.detailItem?.id}
      />

      <AddEntryDialog
        item={host.addItem}
        open={host.addItem !== null}
        onOpenChange={(open) => {
          if (!open) {
            host.setAddItem(null);
          }
        }}
      />

      <LineItemDialog
        open={host.createOpen}
        onOpenChange={host.setCreateOpen}
        mode="create"
        categories={host.flatCategories}
        yearMonth={host.yearMonth}
        initialCategoryName={host.initialCategoryName}
      />

      <LineItemDialog
        open={host.editItem !== null}
        onOpenChange={(open) => {
          if (!open) {
            host.setEditItem(null);
          }
        }}
        mode="edit"
        categories={host.flatCategories}
        yearMonth={host.yearMonth}
        item={host.editItem ?? undefined}
      />

      <ConfirmDialog
        open={host.confirmingDelete}
        onOpenChange={host.setConfirmingDelete}
        title={t("categories.deleteItem")}
        description={
          host.deleteItem
            ? t("categories.deleteLineItemDescription", { label: host.deleteItem.label })
            : undefined
        }
        loading={host.pessimisticDeleting}
        onConfirm={() => {
          if (host.deleteItem) {
            void host.performDelete(host.deleteItem);
          }
        }}
      />

      <RepeatScopeDialog
        open={host.scopeDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            host.setScopeDialogOpen(false);
          }
        }}
        mode="delete"
        scope={host.scope}
        onScopeChange={host.setScope}
        loading={host.pessimisticDeleting}
        loadingDescription={t("repeat.updatingSeries")}
        onConfirm={() => {
          if (host.deleteItem) {
            void host.performDelete(host.deleteItem, host.scope);
          }
        }}
      />
    </>
  );
}

export { useLineItemDialogHost, type LineItemActionHandlers } from "@/lib/useLineItemDialogHost";
