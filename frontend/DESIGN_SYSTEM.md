# Finance Design System

A cute pixel-widget design system for the Finance app. Built on **[Pixelact UI](https://www.pixelactui.com/)**, **shadcn/ui**, **Tailwind CSS 4**, and **Pixelarticons**.

Uses a **Cotton Candy** pink & purple palette:

| Swatch | Hex | Role |
|--------|-----|------|
| Pink | `#fbcfe8` | Secondary / accents |
| Lavender | `#e9d5ff` | Planned / muted |
| Violet | `#c084fc` | Primary / balance |
| Rose | `#fda4af` | Expense / destructive |
| Mint | `#bbf7d0` | Income / success |

## Principles

1. **Clarity** — financial data should be scannable at a glance
2. **Playfulness** — pixel-art components with retro character
3. **Accessibility** — WCAG AA contrast; never convey status with color alone
4. **Responsive feedback** — bouncy press, hover, loading spinners, pixel alerts

## Architecture

```
components/ui/pixelact-ui/   # Pixelact UI components (via shadcn registry)
design-system/
├── tokens.css               # Cotton Candy semantic colors + layout utilities
├── typography.css           # Pixel + body + amount fonts
└── interactions.css         # Motion utilities

lib/
├── icons.ts                 # Pixelarticons registry
├── fonts.ts                 # Press Start 2P + Nunito + JetBrains Mono
└── utils.ts                 # cn() helper
```

## Themes

Day/night via `.dark` class on `<html>` (shadcn pattern):

| Mode | Background | Character |
|------|------------|-----------|
| Day | Soft pink `#fdf2ff` | Bubblegum lavender |
| Night | Deep purple `#1a1225` | Cozy violet dark |

Toggle via header button; preference stored in `localStorage`.

## Components

Use Pixelact UI imports:

```tsx
import { Button } from "@/components/ui/pixelact-ui/button";
import { Badge } from "@/components/ui/pixelact-ui/badge";
import { Card, CardContent } from "@/components/ui/pixelact-ui/card";
import { Input } from "@/components/ui/pixelact-ui/input";
import { Dialog, DialogContent } from "@/components/ui/pixelact-ui/dialog";
```

Button variants: `default`, `secondary`, `success`, `warning`, `destructive`, `link`

## Meaningful Colors

Pastels (`--pastel-*`) are for fills, borders, and badges. Text uses darker `--finance-*-text` tokens in light mode so amounts and labels meet WCAG AA.

| Meaning | Text class | Background class |
|---------|------------|------------------|
| Income | `.text-income` | `.bg-income-subtle` |
| Expense | `.text-expense` | `.bg-expense-subtle` |
| Planned | `.text-planned` | `.bg-planned-subtle` |
| Balance | `.text-balance` | — |

**Rule:** status is always **icon + color + text label**.

## Typography

| Role | Font | Class |
|------|------|-------|
| Headings | Press Start 2P | `.text-display`, `.text-pixel` |
| Body | Nunito | `.text-body` |
| Amounts | JetBrains Mono | `.text-amount` |
| Hero amounts | Press Start 2P | `.text-amount-hero` |

## Do / Don't

| Do | Don't |
|----|-------|
| Use Pixelact UI components | Use DaisyUI classes |
| Pair icons with color and text | Use color alone for status |
| Use `.text-amount` for row values | Use pixel font on dense rows |
