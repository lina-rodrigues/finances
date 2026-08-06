"use client";

import { useCallback, useState } from "react";
import { useTranslation, translateError } from "@/lib/i18n";
import { showToast } from "@/lib/toast";

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
  const { t, locale } = useTranslation();
  const [loading, setLoading] = useState(false);

  const run = useCallback(
    async (fn: () => Promise<void>, options?: { successMessage?: string; errorMessage?: string }) => {
      setLoading(true);
      try {
        await fn();
        if (options?.successMessage) {
          void showToast(options.successMessage, { variant: "success", icon: "check" });
        }
      } catch (err) {
        console.error(err);
        const code = err instanceof Error ? err.message : "";
        const translated = code ? translateError(code, locale) : t("common.somethingWrong");
        void showToast(options?.errorMessage ?? translated, { variant: "danger" });
      } finally {
        setLoading(false);
      }
    },
    [t, locale],
  );

  const runOptimistic = useCallback(
    async <TSnapshot>(options: RunOptimisticOptions<TSnapshot>): Promise<boolean> => {
      const snapshot = options.snapshot();
      options.apply();

      try {
        await options.mutate();
        if (options.successMessage) {
          void showToast(options.successMessage, { variant: "success", icon: "check" });
        }
        options.reconcile?.();
        return true;
      } catch (err) {
        console.error(err);
        options.rollback(snapshot);
        const code = err instanceof Error ? err.message : "";
        const translated = code ? translateError(code, locale) : t("common.somethingWrong");
        void showToast(options.errorMessage ?? translated, { variant: "danger" });
        return false;
      }
    },
    [t, locale],
  );

  return { loading, run, runOptimistic };
}
