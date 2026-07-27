"use client";

import { useState } from "react";
import { Icon } from "@/components/Icon";
import { SettingsDialog } from "@/components/SettingsDialog";
import { useTranslation } from "@/lib/i18n";

import {
  Button,
} from "@lina-rodrigues/cotton-candy";
export function SettingsButton() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="default"
        size="sm"
        className="pressable focus-ring size-9 p-0"
        data-testid="settings-trigger"
        aria-label={t("settings.title")}
        onClick={() => setOpen(true)}
      >
        <Icon name="settings" size="md" colorClass="text-primary-foreground" />
      </Button>
      <SettingsDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
