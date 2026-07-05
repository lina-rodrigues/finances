"use client";

import { useCallback, useState } from "react";
import { useToast } from "@/components/ui/pixelact-ui/toast";
import { useTranslation, translateError } from "@/lib/i18n";

export interface RunOptimisticOptions<TSnapshot> {
  snapshot: () => TSnapshot;
  apply: () => void;
  rollback: (snapshot: TSnapshot) => void;
  mutate: () => Promise<unknown>;
  reconcile?: () => void;
  successMessage?: string;
  errorMessage?: string;
}

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

  const runOptimistic = useCallback(
    async <TSnapshot>(options: RunOptimisticOptions<TSnapshot>) => {
      const snapshot = options.snapshot();
      options.apply();

      try {
        await options.mutate();
        if (options.successMessage) {
          showToast(options.successMessage, "success");
        }
        options.reconcile?.();
      } catch (err) {
        console.error(err);
        options.rollback(snapshot);
        const code = err instanceof Error ? err.message : "";
        const translated = code ? translateError(code, locale) : t("common.somethingWrong");
        showToast(options.errorMessage ?? translated, "error");
      }
    },
    [showToast, t, locale],
  );

  return { loading, run, runOptimistic };
}
