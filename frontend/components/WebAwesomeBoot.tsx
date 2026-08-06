"use client";

import { useEffect } from "react";

const LOADER_ID = "webawesome-loader";

/**
 * Boots Web Awesome from `public/webawesome` (synced from package `dist-cdn`).
 * Plain `dist` has bare npm imports that fail natively in the browser.
 * Must load via a native module script — bundling the autoloader breaks
 * its runtime `import("/webawesome/components/...")` calls.
 */
export function WebAwesomeBoot() {
  useEffect(() => {
    if (document.getElementById(LOADER_ID)) return;

    const script = document.createElement("script");
    script.id = LOADER_ID;
    script.type = "module";
    script.src = "/webawesome/webawesome.loader.js";
    script.setAttribute("data-webawesome", "/webawesome");
    document.body.appendChild(script);
  }, []);

  return <wa-toast id="finance-toast" placement="top" duration={2800}></wa-toast>;
}
