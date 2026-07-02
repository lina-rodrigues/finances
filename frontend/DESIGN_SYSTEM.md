# Finance Design System

A small, token-based design system for the Finance app. Built on **DaisyUI 5**, **Tailwind CSS 4**, and **Font Awesome**.

## Principles

1. **Clarity** — financial data should be scannable at a glance
2. **Trust** — restrained blues, professional typography, no flashy motion on numbers
3. **Accessibility** — WCAG AA contrast; never convey status with color alone
4. **Responsive feedback** — hover, focus, loading, and toast states on every interaction

## Architecture

```
design-system/
├── themes.css        # finance-light & finance-dark DaisyUI themes (OKLCH)
├── tokens.css        # App semantic color aliases + utility classes
├── typography.css    # .text-amount, .text-display
└── interactions.css  # Motion tokens, hover/focus utilities

lib/
├── icons.ts          # Font Awesome icon registry + semantic color map
├── fonts.ts          # Inter + JetBrains Mono
└── useMutationFeedback.ts  # Shared async loading + toast pattern

components/
└── Icon.tsx          # Semantic icon wrapper
```

## Themes

Two DaisyUI themes centered on **hue 245** (trust blue):

| Theme | `data-theme` | Character |
|-------|--------------|-----------|
| Light | `finance-light` | Off-white ledger sheet |
| Dark | `finance-dark` | Deep navy surfaces (not pure black) |

Toggle via navbar button; preference stored in `localStorage`.

## Meaningful Colors

| Meaning | Token | Utility class | DaisyUI |
|---------|-------|---------------|---------|
| Income | `--finance-income` | `.text-income` | `success` |
| Expense | `--finance-expense` | `.text-expense` | `error` |
| Planned | `--finance-planned` | `.text-planned` | `warning` |
| Balance | `--finance-balance` | `.text-balance` | `primary` |
| Muted | `--finance-muted` | `.text-muted-finance` | — |

Subtle backgrounds: `.bg-income-subtle`, `.bg-expense-subtle`, `.bg-planned-subtle`

**Rule:** status is always **icon + color + text label**.

## Icons (Font Awesome)

Use the `<Icon name="..." />` component — never import FA icons directly in UI code.

| Name | Icon | Color | Usage |
|------|------|-------|-------|
| `income` | arrow-trend-up | green | Income badges |
| `expense` | arrow-trend-down | red | Expense badges |
| `planned` | clock | amber | Unrealized items |
| `balance` | wallet | blue | Last month balance |
| `endingBalance` | scale-balanced | blue | Ending balance |
| `category` | folder | muted | Category headers |
| `add` | plus | primary | Add item |
| `edit` | pen | neutral | Edit action |
| `delete` | trash | error | Delete action |
| `save` | check | primary | Save |
| `cancel` | xmark | neutral | Cancel |
| `themeLight` | sun | warning | Light mode |
| `themeDark` | moon | info | Dark mode |
| `logo` | chart-pie | primary | App title |

Sizes: `xs` (12px), `sm` (14px), `md` (16px), `lg` (20px)

## Typography

| Role | Font | Class |
|------|------|-------|
| UI / headings | Inter | `.text-display`, body default |
| Amounts | JetBrains Mono | `.text-amount` (tabular-nums) |

Amounts are right-aligned in line item rows; labels are left-aligned.

## Interaction

| Utility | Purpose |
|---------|---------|
| `.interactive-row` | Row hover highlight; action buttons reveal on hover |
| `.interactive-surface` | General clickable surface feedback |
| `.pressable` | Button press scale (0.98) |
| `.focus-ring` | Keyboard focus outline |
| `.fade-in` | Form/edit mode entrance |
| `.card-hover-lift` | Stat card shadow on hover |

Motion respects `prefers-reduced-motion`.

### Async mutations

All create/update/delete actions use `useMutationFeedback`:

1. Disable controls + show loading spinner on button
2. Toast on success or error
3. `router.refresh()` on success

## Component Patterns

- **MonthSummary** — stat cards with icon + amount; ending balance in primary color
- **CategorySection** — collapsible with folder icon; category total right-aligned
- **LineItemRow** — icon+label badge for type; planned badge with clock icon; edit/delete on hover
- **AddLineItemForm** — expand with fade-in; plus icon trigger

## Do / Don't

| Do | Don't |
|----|-------|
| Pair icons with color and text for status | Use color alone for income/expense |
| Use `.text-amount` for all monetary values | Animate balance numbers |
| Show loading state during API calls | Silently fail on errors |
| Use semantic icon names via `<Icon>` | Import FA icons in components |
