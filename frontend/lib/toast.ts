export type ToastVariant = "brand" | "success" | "neutral" | "warning" | "danger";

export async function showToast(
  message: string,
  opts?: { variant?: ToastVariant; icon?: string },
) {
  if (typeof document === "undefined") return;
  const host = document.getElementById("finance-toast") as
    | (HTMLElement & {
        create?: (msg: string, options?: Record<string, unknown>) => void;
      })
    | null;
  if (!host?.create) return;
  host.create(message, {
    variant: opts?.variant ?? "brand",
    icon: opts?.icon,
  });
}
