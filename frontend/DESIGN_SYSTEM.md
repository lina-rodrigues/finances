# Design system

This app uses **[Web Awesome Pro](https://webawesome.com/)** (`@web.awesome.me/webawesome-pro`) via npm.

## Theme

Classes on `<html>`:

`wa-theme-default wa-palette-rudimentary` plus `wa-light` or `wa-dark`.

Styles imported in [`app/globals.css`](app/globals.css) from package **`dist`** (bundler):

- `@web.awesome.me/webawesome-pro/dist/styles/themes/default.css`
- `@web.awesome.me/webawesome-pro/dist/styles/color/palettes/rudimentary.css`
- `@web.awesome.me/webawesome-pro/dist/styles/utilities.css`
- `@web.awesome.me/webawesome-pro/dist/styles/native.css`

Runtime components load from **`public/webawesome` → `dist-cdn`** (browser-ready; do not point the loader at plain `dist` — bare imports like `@shoelace-style/animations` fail in the browser).

Money amounts use app classes `metric-amount` / `metric-amount--income` / `metric-amount--expense` / `metric-amount--muted` (success / danger / quiet WA tokens).

## Agent skills

Project skills (with package `references/` symlinks):

- [`skills/webawesome`](../skills/webawesome/)
- [`skills/webawesome-design`](../skills/webawesome-design/)

Also mirrored under [`.cursor/skills/`](../.cursor/skills/). Prefer patterns from https://webawesome.com/docs/patterns and WA utilities over custom CSS.

## Layout

Authenticated app shell: `<wa-page>` in [`components/AppShell.tsx`](components/AppShell.tsx) with sidebar navigation (Finance, Categories, Reports, Settings).

## Icons

Category icon keys are validated in the API (`api/src/constants/categoryIcons.ts`) and mapped to Font Awesome names in [`lib/categoryIcons.ts`](lib/categoryIcons.ts) for `<wa-icon>`.

## Verification

Prefer visual checks on light/dark and mobile drawer + desktop sidebar. Use WA tokens and `*-on-*` pairings for contrast.
