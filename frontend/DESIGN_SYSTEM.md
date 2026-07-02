# Finance Design System

A cute pixel-widget design system for the Finance app. Built on **DaisyUI 5**, **Tailwind CSS 4**, and **[Pixelarticons](https://github.com/halfmage/pixelarticons)**.

Inspired by [Nasha Wanich](https://github.com/nasha-wanich)'s Little Calendar aesthetic — lavender candy palette, framed panels, pixel headings, and playful motion.

## Principles

1. **Clarity** — financial data should be scannable at a glance
2. **Playfulness** — widget-as-toy feel with character, not corporate SaaS
3. **Accessibility** — WCAG AA contrast; never convey status with color alone
4. **Responsive feedback** — bouncy press, hover, loading, and speech-bubble toasts

## Architecture

```
design-system/
├── themes.css        # finance-light & finance-dark (cute lavender palette)
├── tokens.css        # Semantic colors, frame utilities, pill badges
├── typography.css    # .text-display, .text-amount, .text-amount-hero
└── interactions.css  # Spring motion, hover/focus utilities

lib/
├── icons.ts          # Pixelarticons registry + semantic color map
├── fonts.ts          # Press Start 2P + Nunito + JetBrains Mono
└── useMutationFeedback.ts

components/
├── Frame.tsx         # Framed panel wrapper
├── CoinCounter.tsx   # Balance stat with coin sprite
├── BudgetBar.tsx     # HP-bar style expense progress
└── Icon.tsx          # Semantic icon wrapper

public/assets/
├── coin.svg
├── mascot-piggy.svg
└── sparkle.svg
```

## Themes

Two DaisyUI themes on **hue ~300** (lavender candy):

| Theme | `data-theme` | Character |
|-------|--------------|-----------|
| Day | `finance-light` | Cream-lavender widget |
| Night | `finance-dark` | Deep purple widget |

Toggle via header button; preference stored in `localStorage`.

## Meaningful Colors

| Meaning | Token | Utility class |
|---------|-------|---------------|
| Income | `--finance-income` | `.text-income` (mint green) |
| Expense | `--finance-expense` | `.text-expense` (coral) |
| Planned | `--finance-planned` | `.text-planned` (star amber) |
| Balance | `--finance-balance` | `.text-balance` (lavender primary) |
| Muted | `--finance-muted` | `.text-muted-finance` |

Subtle backgrounds: `.bg-income-subtle`, `.bg-expense-subtle`, `.bg-planned-subtle`

**Rule:** status is always **icon + color + text label**.

## Typography

| Role | Font | Class |
|------|------|-------|
| Headings / labels | Press Start 2P | `.text-display`, `.text-pixel` |
| Body / dense rows | Nunito | `.text-body` |
| Amounts (rows) | JetBrains Mono | `.text-amount` |
| Hero amounts | Press Start 2P + stroke | `.text-amount-hero` |

Pixel font is used for headings and hero stats only — never on dense line-item rows.

## Icons (Pixelarticons)

Use the `<Icon name="..." />` component — never import pixelarticons directly in UI code.

| Name | Pixelarticon | Usage |
|------|--------------|-------|
| `income` | WavesArrowUp | Income badges |
| `expense` | WavesArrowDown | Expense badges |
| `planned` | Clock | Unrealized items |
| `balance` | Wallet | Last month balance |
| `endingBalance` | Scale | Ending balance |
| `add` / `edit` / `delete` | Plus / PenSquare / Trash | Actions |
| `themeLight` / `themeDark` | CloudSun / Moon | Day/night toggle |

Sizes: `xs` (12px), `sm` (16px), `md` (20px), `lg` (24px)

## Frame & Layout Utilities

| Utility | Purpose |
|---------|---------|
| `.frame-panel` | Outer decorative border + glow |
| `.frame-panel-inner` | Inner content surface |
| `.pill-title` | App title badge in header |
| `.inventory-slot` | Stat card / category row slot |
| `.icon-slot` | Bordered square for category icons |
| `.badge-pill` | Thick-bordered capsule badges |
| `.bg-dots` | Dot pattern page background |
| `.toast-bubble` | Speech-bubble toast shape |

## Interaction

| Utility | Purpose |
|---------|---------|
| `.interactive-row` | Row hover highlight; actions reveal on hover |
| `.pressable` | Bouncy button press (scale 0.95) |
| `.focus-ring` | Keyboard focus outline |
| `.fade-in` | Form/edit entrance with bounce |
| `.card-hover-lift` | Panel lift + glow on hover |
| `.sparkle-pop` | Success toast sparkle animation |

Motion respects `prefers-reduced-motion`.

## Game Metaphors

- **Coin counter** — balance stats with coin sprite
- **Budget HP bars** — expense planned vs realized per category
- **Quest badges** — pill badges for income/expense/planned status
- **Level up banner** — shown when ending balance beats last month

## Do / Don't

| Do | Don't |
|----|-------|
| Pair icons with color and text for status | Use color alone for income/expense |
| Use `.text-amount` for row monetary values | Animate balance numbers |
| Use pixel font for headings and hero stats | Use pixel font on dense data rows |
| Show loading state during API calls | Silently fail on errors |
| Use semantic icon names via `<Icon>` | Import pixelarticons directly in components |
