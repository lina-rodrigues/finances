"use client";

import { useState } from "react";
import { SettingsDialog } from "@/components/SettingsDialog";
import { Icon } from "@/components/Icon";
import { Button } from "@/components/ui/pixelact-ui/button";
import { useTranslation } from "@/lib/i18n";

export function SettingsButton() {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="pressable focus-ring"
        onClick={() => setOpen(true)}
        aria-label={t("settings.title")}
      >
        <Icon name="settings" size="md" />
      </Button>
      <SettingsDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
