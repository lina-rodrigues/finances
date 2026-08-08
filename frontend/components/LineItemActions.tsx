"use client";

import type { LineItem } from "@/lib/api";
import { isPayDisabled } from "@/lib/payLineItem";
import { useTranslation } from "@/lib/i18n";

interface LineItemActionsProps {
  item: LineItem;
  onPay: (item: LineItem) => void;
  onAdd: (item: LineItem) => void;
  onEdit: (item: LineItem) => void;
  onDelete?: (item: LineItem) => void;
  layout?: "inline" | "footer";
  payDisabled?: boolean;
  loading?: boolean;
}

export function LineItemActions({
  item,
  onPay,
  onAdd,
  onEdit,
  onDelete,
  layout = "inline",
  payDisabled,
  loading = false,
}: LineItemActionsProps) {
  const { t } = useTranslation();
  const disabledPay = payDisabled ?? isPayDisabled(item);
  const iconOnly = layout === "inline";
  const payLabel = t("entries.pay");
  const addLabel = t("entries.addSubmit");
  const editLabel = t("entries.edit");
  const deleteLabel = t("common.delete");
  const moreLabel = t("entries.itemActions");

  if (iconOnly) {
    return (
      <div
        className="wa-cluster wa-gap-2xs"
        style={{ flexShrink: 0, justifyContent: "flex-end" }}
        onClick={(event) => event.stopPropagation()}
      >
        <wa-button
          type="button"
          appearance="plain"
          size="s"
          disabled={loading || disabledPay || undefined}
          loading={loading || undefined}
          onClick={() => onPay(item)}
          aria-label={payLabel}
          title={payLabel}
        >
          <wa-icon name="circle-dollar-to-slot" label={payLabel}></wa-icon>
        </wa-button>
        <wa-button
          type="button"
          appearance="plain"
          size="s"
          disabled={loading || undefined}
          onClick={() => onAdd(item)}
          aria-label={addLabel}
          title={addLabel}
        >
          <wa-icon name="plus" label={addLabel}></wa-icon>
        </wa-button>
        <wa-button
          type="button"
          appearance="plain"
          size="s"
          disabled={loading || undefined}
          onClick={() => onEdit(item)}
          aria-label={editLabel}
          title={editLabel}
        >
          <wa-icon name="pen" label={editLabel}></wa-icon>
        </wa-button>
      </div>
    );
  }

  function handleMoreSelect(event: Event) {
    const detail = (event as CustomEvent<{ item: { value?: string } }>).detail;
    const value = detail?.item?.value;
    if (value === "edit") {
      onEdit(item);
    } else if (value === "delete" && onDelete) {
      onDelete(item);
    }
  }

  return (
    <div
      className="wa-cluster wa-gap-s"
      style={{ flexWrap: "wrap" }}
      onClick={(event) => event.stopPropagation()}
    >
      <wa-button
        type="button"
        variant="brand"
        size="s"
        disabled={loading || disabledPay || undefined}
        loading={loading || undefined}
        onClick={() => onPay(item)}
        aria-label={payLabel}
      >
        <wa-icon slot="start" name="circle-dollar-to-slot"></wa-icon>
        {payLabel}
      </wa-button>
      <wa-button
        type="button"
        variant="neutral"
        appearance="outlined"
        size="s"
        disabled={loading || undefined}
        onClick={() => onAdd(item)}
        aria-label={addLabel}
      >
        <wa-icon slot="start" name="plus"></wa-icon>
        {addLabel}
      </wa-button>
      <wa-dropdown placement="top-end" onWaSelect={handleMoreSelect}>
        <wa-button
          slot="trigger"
          type="button"
          variant="neutral"
          appearance="outlined"
          size="s"
          disabled={loading || undefined}
          aria-label={moreLabel}
        >
          <wa-icon name="ellipsis" label={moreLabel}></wa-icon>
        </wa-button>
        <wa-dropdown-item value="edit">
          <wa-icon slot="icon" name="pen"></wa-icon>
          {editLabel}
        </wa-dropdown-item>
        {onDelete ? (
          <wa-dropdown-item value="delete" variant="danger">
            <wa-icon slot="icon" name="trash"></wa-icon>
            {deleteLabel}
          </wa-dropdown-item>
        ) : null}
      </wa-dropdown>
    </div>
  );
}
