# Finance Design System

A cute pixel-widget design system for the Finance app. Built on **[Pixelact UI](https://www.pixelactui.com/)**, **shadcn/ui**, **Tailwind CSS 4**, and **Pixelarticons**.

Uses the **Pastel Retro** palette from [Pixelact UI Colors](https://www.pixelactui.com/colors):

| Swatch | Hex | Role |
|--------|-----|------|
| Pink | `#ffb3ba` | Expense / destructive |
| Peach | `#ffdfba` | Planned / muted |
| Yellow | `#ffffba` | Background (day) |
| Mint | `#baffc9` | Income / success |
| Blue | `#bae1ff` | Primary / balance |

## Principles

1. **Clarity** — financial data should be scannable at a glance
2. **Playfulness** — pixel-art components with retro character
3. **Accessibility** — WCAG AA contrast; never convey status with color alone
4. **Responsive feedback** — bouncy press, hover, loading spinners, pixel alerts

## Architecture

```
components/ui/pixelact-ui/   # Pixelact UI components (via shadcn registry)
design-system/
├── tokens.css               # Pastel Retro semantic colors + layout utilities
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
| Day | Pastel yellow `#ffffba` | Soft retro candy |
| Night | Deep purple `#2a2830` | Muted pastel dark |

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

| Meaning | Utility class |
|---------|---------------|
| Income | `.text-income` / `.bg-income-subtle` |
| Expense | `.text-expense` / `.bg-expense-subtle` |
| Planned | `.text-planned` / `.bg-planned-subtle` |
| Balance | `.text-balance` |

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
