---
name: webawesome-design
description: >-
  Design and lay out UIs with Web Awesome. Use when building or restyling a
  page, layout, or section; choosing themes/palettes; applying brand colors or
  --wa-* tokens; or composing a polished UI. Triggers on app shell, dashboard,
  settings page, theming, spacing, or "make this look designed". Pair with the
  webawesome skill for component APIs.
---

# Designing with Web Awesome (Finance app)

Docs: https://webawesome.com/docs/ · Page layout: https://webawesome.com/docs/components/page · Themes: https://webawesome.com/docs/themes/ · Patterns: https://webawesome.com/docs/patterns/

Full design references: see `references/` (symlinked from `@web.awesome.me/webawesome-pro`).

## Rules for this Finance app

1. **Design system first** — prefer `wa-*` components and `wa-stack` / `wa-cluster` / `wa-gap-*`. Prefer patterns over custom layouts.
2. **Full-page app** — `<wa-page>` with `slot="navigation"` (Finance / Categories / Reports / Settings). No PhoneShell or bottom tab bar.
3. **Theme** — npm Pro + `wa-theme-default wa-palette-rudimentary` on `<html>`, with Theme Builder `:root` font/radius/space overrides.
4. Prefer variants / `--wa-*` tokens and WA utilities over custom CSS.
5. Always close custom element tags.
6. **npm only** — do not switch this app to the CDN kit loader.
