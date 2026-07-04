"use client";

import { useCallback, useState } from "react";
import { useToast } from "@/components/ui/pixelact-ui/toast";
import { useTranslation, translateError } from "@/lib/i18n";

export function useMutationFeedback() {
  const { showToast } = useToast();
  const { t, locale } = useTranslation();
  const [loading, setLoading] = useState(false);

  const run = useCallback(
    async (fn: () => Promise<void>, options?: { successMessage?: string; errorMessage?: string }) => {
      setLoading(true);
      try {
        await fn();
        if (options?.successMessage) {
          showToast(options.successMessage, "success");
        }
      } catch (err) {
        console.error(err);
        const code = err instanceof Error ? err.message : "";
        const translated = code ? translateError(code, locale) : t("common.somethingWrong");
        showToast(options?.errorMessage ?? translated, "error");
      } finally {
        setLoading(false);
      }
    },
    [showToast, t, locale],
  );

  return { loading, run };
}
