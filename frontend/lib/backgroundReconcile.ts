import type { useRouter } from "next/navigation";

type AppRouter = ReturnType<typeof useRouter>;

/**
 * Fire-and-forget RSC revalidation after an optimistic mutation succeeds.
 * Tier 1: pass as the `reconcile` callback in `runOptimistic`.
 */
export function backgroundReconcile(router: AppRouter): void {
  void router.refresh();
}
