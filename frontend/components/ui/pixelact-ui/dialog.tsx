"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  DialogOverlayPortalProvider,
  useAppDialogPortal,
} from "@/components/DialogPortals";
import "@/components/ui/pixelact-ui/styles/styles.css";

/**
 * Resolves the app-shell portal element without reading the ref during render,
 * so the dialog never portals to document.body for a frame and then re-portals.
 */
function usePortalContainer(
  portalRef: React.RefObject<HTMLDivElement | null> | null,
): HTMLDivElement | undefined {
  const [container, setContainer] = React.useState<HTMLDivElement | null>(null);

  React.useLayoutEffect(() => {
    setContainer(portalRef?.current ?? null);
  });

  // Parent shell ref is set before user interaction; prefer live ref over stale state.
  return portalRef?.current ?? container ?? undefined;
}

const Dialog = ({ ...props }: React.ComponentProps<typeof DialogPrimitive.Root>) => {
  return <DialogPrimitive.Root {...props} />;
};

const DialogClose = DialogPrimitive.Close;
const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = DialogPrimitive.Portal;

const DialogOverlay = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay> & {
    inAppShell?: boolean;
  }
>(({ className, inAppShell = false, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      // Must sit above the sticky app header (z-40) and the add-item FAB (z-30)
      inAppShell ? "absolute inset-0 z-50" : "fixed inset-0 z-50",
      "bg-black/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className,
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => {
  const overlayPortalRef = React.useRef<HTMLDivElement>(null);
  const appPortalRef = useAppDialogPortal();
  const portalContainer = usePortalContainer(appPortalRef);
  const portaledInShell = portalContainer != null;

  return (
    <DialogPortal container={portalContainer}>
      <DialogOverlay inAppShell={portaledInShell} />
      <DialogOverlayPortalProvider portalRef={overlayPortalRef}>
        <DialogPrimitive.Content
          ref={ref}
          className={cn(
            "dialog-content-frame pixel-font rounded-none shadow-(--pixel-box-shadow) bg-background grid max-h-[calc(100%-2rem)] gap-4 overflow-visible border p-6 duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            portaledInShell
              ? "absolute top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2"
              : "fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2",
            className,
          )}
          {...props}
        >
          {children}
          <div
            ref={overlayPortalRef}
            data-slot="dialog-overlay-portal"
            className="pointer-events-none absolute inset-0 z-[60] overflow-visible [&_[data-slot=select-positioner]]:pointer-events-auto"
          />
          <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none disabled:pointer-events-none">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="32"
              height="32"
              viewBox="0 0 24 24"
              className="cursor-pointer"
              aria-hidden
            >
              <path
                className="fill-foreground"
                d="M5 5h2v2H5zm4 4H7V7h2zm2 2H9V9h2zm2 0h-2v2H9v2H7v2H5v2h2v-2h2v-2h2v-2h2v2h2v2h2v2h2v-2h-2v-2h-2v-2h-2zm2-2v2h-2V9zm2-2v2h-2V7zm0 0V5h2v2z"
              />
            </svg>
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogOverlayPortalProvider>
    </DialogPortal>
  );
});
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({ className, ...props }: React.ComponentProps<"div">) => (
  <div className={cn("flex flex-col gap-2", className)} {...props} />
);

const DialogFooter = ({ className, ...props }: React.ComponentProps<"div">) => (
  <div className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)} {...props} />
);

const DialogTitle = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("pixel-font text-foreground", className)}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-body text-muted-finance text-sm", className)}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTrigger,
  DialogPortal,
  DialogOverlay,
  DialogTitle,
  DialogDescription,
  DialogHeader,
  DialogFooter,
};
