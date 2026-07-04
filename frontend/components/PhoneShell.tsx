"use client";

import { useEffect, useRef } from "react";
import { AppDialogPortalProvider } from "@/components/DialogPortals";

export function syncAppShellMetrics(shell: HTMLElement) {
  const rect = shell.getBoundingClientRect();
  document.documentElement.style.setProperty("--app-shell-left", `${rect.left}px`);
  document.documentElement.style.setProperty("--app-shell-width", `${rect.width}px`);
}

export function PhoneShell({ children }: { children: React.ReactNode }) {
  const portalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const shell = portalRef.current;
    if (!shell) {
      return;
    }

    syncAppShellMetrics(shell);

    const observer = new ResizeObserver(() => {
      syncAppShellMetrics(shell);
    });
    observer.observe(shell);

    const handleResize = () => syncAppShellMetrics(shell);
    window.addEventListener("resize", handleResize);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", handleResize);
      document.documentElement.style.removeProperty("--app-shell-left");
      document.documentElement.style.removeProperty("--app-shell-width");
    };
  }, []);

  return (
    <AppDialogPortalProvider portalRef={portalRef}>
      <div className="phone-shell relative" ref={portalRef}>
        {children}
      </div>
    </AppDialogPortalProvider>
  );
}
