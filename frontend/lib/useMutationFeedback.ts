"use client";

import { useCallback, useState } from "react";
import { useToast } from "@/components/ToastProvider";

export function useMutationFeedback() {
  const { showToast } = useToast();
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
        showToast(options?.errorMessage ?? "Something went wrong. Please try again.", "error");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [showToast],
  );

  return { loading, run };
}
