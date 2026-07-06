"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { CategoryManagerEditor, type CategoryManagerEditorHandle } from "@/components/CategoryManagerEditor";
import { Icon } from "@/components/Icon";
import { Button } from "@/components/ui/pixelact-ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/pixelact-ui/dialog";
import { categoryManagePath } from "@/lib/api";
import { useMonthView } from "@/lib/MonthViewProvider";
import { useTranslation } from "@/lib/i18n";

export function CategoryManager() {
  const { t } = useTranslation();
  const { month } = useMonthView();
  const editorRef = useRef<CategoryManagerEditorHandle>(null);
  const [open, setOpen] = useState(false);
  const manageHref = categoryManagePath(month.yearMonth);

  function handleClose() {
    setOpen(false);
  }

  function tryCloseDialog() {
    if (editorRef.current?.requestClose() ?? true) {
      setOpen(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="default"
        size="sm"
        className="pressable focus-ring hidden gap-1 md:inline-flex"
        asChild
      >
        <Link href={manageHref}>
          <Icon name="edit" size="xs" />
          {t("categories.manage")}
        </Link>
      </Button>

      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (nextOpen) {
            setOpen(true);
            return;
          }
          tryCloseDialog();
        }}
      >
        <Button
          type="button"
          variant="default"
          size="sm"
          className="pressable focus-ring gap-1 md:hidden"
          onClick={() => setOpen(true)}
        >
          <Icon name="edit" size="xs" />
          {t("categories.manage")}
        </Button>
        <DialogContent className="dialog-content-frame-wide flex max-h-[85dvh] flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle className="text-display text-xs normal-case">
              {t("categories.manageTitle")}
            </DialogTitle>
            <p className="text-muted-finance text-body text-sm">{t("categories.manageHint")}</p>
          </DialogHeader>

          <div className="category-manager-scroll flex-1 px-6">
            <CategoryManagerEditor ref={editorRef} onRequestClose={handleClose} />
          </div>

          <DialogFooter className="gap-2 px-6 pb-6 pt-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="pressable focus-ring"
              onClick={tryCloseDialog}
            >
              {t("categories.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
