"use client";

import { useEffect, useRef, type RefObject } from "react";

/**
 * Keep React `open` in sync when a <wa-dialog> finishes hiding.
 * Child overlays (wa-select, wa-dropdown) also emit bubbling `wa-after-hide`.
 */
export function useWaDialogAfterHide(
  dialogRef: RefObject<HTMLElement | null>,
  open: boolean,
  onOpenChange: (open: boolean) => void,
) {
  const openRef = useRef(open);
  openRef.current = open;

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) {
      return;
    }

    const onAfterHide = (event: Event) => {
      if (event.target !== el) {
        return;
      }
      if (openRef.current) {
        onOpenChange(false);
      }
    };

    el.addEventListener("wa-after-hide", onAfterHide);
    return () => el.removeEventListener("wa-after-hide", onAfterHide);
  }, [onOpenChange]);
}
