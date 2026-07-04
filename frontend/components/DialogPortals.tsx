"use client";

import * as React from "react";

function createPortalRefContext() {
  const Context = React.createContext<React.RefObject<HTMLDivElement | null> | null>(null);

  function Provider({
    portalRef,
    children,
  }: {
    portalRef: React.RefObject<HTMLDivElement | null>;
    children: React.ReactNode;
  }) {
    return <Context.Provider value={portalRef}>{children}</Context.Provider>;
  }

  function usePortalRef() {
    return React.useContext(Context);
  }

  return { Provider, usePortalRef };
}

const appDialogPortal = createPortalRefContext();
const dialogOverlayPortal = createPortalRefContext();

export const AppDialogPortalProvider = appDialogPortal.Provider;
export const useAppDialogPortal = appDialogPortal.usePortalRef;

export const DialogOverlayPortalProvider = dialogOverlayPortal.Provider;
export const useDialogOverlayPortal = dialogOverlayPortal.usePortalRef;
