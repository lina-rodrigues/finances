"use client";

import { useRef } from "react";
import { AppDialogPortalProvider } from "@/components/DialogPortals";

export function PhoneShell({ children }: { children: React.ReactNode }) {
  const portalRef = useRef<HTMLDivElement>(null);

  return (
    <AppDialogPortalProvider portalRef={portalRef}>
      <div className="phone-shell relative" ref={portalRef}>
        {children}
      </div>
    </AppDialogPortalProvider>
  );
}
