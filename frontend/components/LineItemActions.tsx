"use client";

import { Icon } from "@/components/Icon";
import type { LineItem } from "@/lib/api";
import type { IconSize } from "@/lib/icons";
import { isPayDisabled } from "@/lib/payLineItem";
import { useTranslation } from "@/lib/i18n";

import {
  Button,
  Spinner,
} from "@lina-rodrigues/cotton-candy";
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

const inlineIconButtonClass =
  "pressable focus-ring h-auto min-h-0 p-1.5 no-underline shadow-none outline-none active:translate-y-0 hover:bg-transparent";

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
  const inlineIconSize: IconSize = "sm";
  const footerSizeClass = "gap-1";

  if (iconOnly) {
    return (
      <div
        className="flex shrink-0 items-center justify-end gap-2"
        onClick={(event) => event.stopPropagation()}
      >
        <Button
          type="button"
          variant="link"
          size="sm"
          className={inlineIconButtonClass}
          disabled={loading || disabledPay}
          onClick={() => onPay(item)}
          aria-label={payLabel}
          title={payLabel}
        >
          {loading ? (
            <Spinner className="size-4" />
          ) : (
            <Icon name="pay" size={inlineIconSize} colorClass="text-income" />
          )}
        </Button>
        <Button
          type="button"
          variant="link"
          size="sm"
          className={inlineIconButtonClass}
          disabled={loading}
          onClick={() => onAdd(item)}
          aria-label={addLabel}
          title={addLabel}
        >
          <Icon name="add" size={inlineIconSize} colorClass="text-link" />
        </Button>
        <Button
          type="button"
          variant="link"
          size="sm"
          className={inlineIconButtonClass}
          disabled={loading}
          onClick={() => onEdit(item)}
          aria-label={editLabel}
          title={editLabel}
        >
          <Icon name="edit" size={inlineIconSize} colorClass="text-muted-foreground" />
        </Button>
      </div>
    );
  }

  return (
    <div
      className="flex flex-wrap items-center gap-2"
      onClick={(event) => event.stopPropagation()}
    >
      <Button
        type="button"
        variant="default"
        size="sm"
        className={`pressable focus-ring ${footerSizeClass}`}
        disabled={loading || disabledPay}
        onClick={() => onPay(item)}
        aria-label={payLabel}
      >
        {loading ? (
          <Spinner className="size-3" />
        ) : (
          <Icon name="pay" size="xs" colorClass="text-primary-foreground" />
        )}
        {payLabel}
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className={`pressable focus-ring ${footerSizeClass}`}
        disabled={loading}
        onClick={() => onAdd(item)}
        aria-label={addLabel}
      >
        <Icon name="add" size="xs" />
        {addLabel}
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className={`pressable focus-ring ${footerSizeClass}`}
        disabled={loading}
        onClick={() => onEdit(item)}
        aria-label={editLabel}
      >
        <Icon name="edit" size="xs" />
        {editLabel}
      </Button>
      {onDelete && (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className={`pressable focus-ring text-destructive ${footerSizeClass}`}
          disabled={loading}
          onClick={() => onDelete(item)}
          aria-label={deleteLabel}
        >
          <Icon name="delete" size="xs" colorClass="text-expense" />
          {deleteLabel}
        </Button>
      )}
    </div>
  );
}
