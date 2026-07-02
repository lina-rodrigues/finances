"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import Image from "next/image";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let toastId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = "info") => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="toast toast-top toast-end z-50">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`toast-bubble alert alert-sm fade-in ${
              toast.type === "error"
                ? "alert-error"
                : toast.type === "success"
                  ? "alert-success"
                  : "alert-info"
            }`}
          >
            <div className="flex items-center gap-2">
              {toast.type === "success" && (
                <Image
                  src="/assets/sparkle.svg"
                  alt=""
                  width={14}
                  height={14}
                  className="sparkle-pop shrink-0"
                  aria-hidden
                />
              )}
              <span className="text-body font-semibold">{toast.message}</span>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return ctx;
}
