"use client";

import Image from "next/image";
import { useCallback } from "react";
import { toast as sonnerToast } from "sonner";
import { cn } from "@/lib/utils";
import "@/components/ui/pixelact-ui/styles/styles.css";

type ToastType = "success" | "error" | "info";

const variantClass: Record<ToastType, string> = {
  success: "bg-income-subtle",
  error: "bg-expense-subtle",
  info: "bg-primary/40",
};

export function toast(message: string, type: ToastType = "info") {
  return sonnerToast.custom(
    (id) => <Toast id={id} title={message} type={type} />,
    { duration: 4000 },
  );
}

export function useToast() {
  const showToast = useCallback((message: string, type: ToastType = "info") => {
    toast(message, type);
  }, []);

  return { showToast };
}

interface ToastProps {
  id: string | number;
  title: string;
  type: ToastType;
}

function Toast({ title, type }: ToastProps) {
  return (
    <div
      className={cn(
        "box-shadow-margin flex w-full max-w-sm items-center gap-2 bg-background p-4 shadow-(--pixel-box-shadow)",
        variantClass[type],
      )}
    >
      {type === "success" && (
        <Image
          src="/assets/sparkle.svg"
          alt=""
          width={14}
          height={14}
          className="sparkle-pop shrink-0"
          aria-hidden
        />
      )}
      <p className="pixel-font text-sm font-semibold text-foreground">{title}</p>
    </div>
  );
}

export { Toast };
