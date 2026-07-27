# Category manager — design reference

Reference for the category list editor (`CategoryManagerEditor`, `/categories/manage`).

## Problem (before redesign)

The original modal squeezed every category into one wrapping row inside a **24rem** dialog:

- Reorder arrows, icon preview, name input, text-only icon `<Select>`, Save, and Delete competed for width.
- Nested scroll regions (`DialogContent` + inner `max-h-[50vh]`) made long lists awkward.
- Each row required an explicit Save click; reorder fired one API call per arrow click.
- Icon picking showed camelCase labels (`cartShopping`) instead of pixel icons.
- On desktop, a phone-width modal inside a **56rem** shell felt cramped.

## Architecture

| Surface | Breakpoint | Entry |
|---------|------------|-------|
| **Full page** | All sizes | Settings → “Manage categories” → `/categories/manage?month=YYYY-MM` |

Shared UI and logic live in **`CategoryManagerEditor`**. **`CategoryIconPicker`** is reused for list rows and the add form.

```
SettingsDialog
  └── Link → /categories/manage

/categories/manage
  └── CategoryManagePage → CategoryManagerEditor
```

## Layout

### Manage page (`/categories/manage`)

- Uses full phone-shell width (no dialog cap).
- Back link returns to `/categories` preserving `?month=`.
- Horizontal room for name inputs and row actions across mobile and desktop.

### Category row

```
[≡ drag] [icon ▼] [ name input ───────────────────── ] [status] [🗑]
```

- **Mobile (`< sm`)**: up/down arrow buttons remain as an accessibility fallback (`sm:hidden`).
- **Desktop**: drag handle (`SortVertical` icon) is primary reorder affordance.
- **Delete**: icon-only destructive button at row end.
- **Status**: inline badge — “saving” / “saved” / “error” (auto-save feedback); no per-row Save button. Badges use semantic text classes on subtle backgrounds (`text-planned`, `text-income`, `text-expense`).

### Add category (top of list)

```
[icon ▼] [ name input ─────────────── ] [Add]
```

Enter key submits when name is non-empty.

## Icon picker (`CategoryIconPicker`)

- Trigger: button showing current `<Icon />` + chevron.
- Popover: 4-column grid of all `categoryIcons` (24 icons, synced with API `categoryIcons.ts`).
- Selected cell: `.category-icon-picker-cell-selected` (border + tinted background).
- Labels exposed via `aria-label` + `formatIconLabel()` for screen readers.
- Closes on selection or outside click.

## Persistence model

| Action | When | Toast |
|--------|------|-------|
| Rename / change icon | **500ms debounce** after last edit | Error only |
| Reorder | On drop (drag) or arrow click (mobile) | Error only |
| Add category | Add button / Enter | Success |
| Delete category | Confirm dialog | Success |

Debounced saves use `runOptimistic` with `successMessage: undefined` to avoid toast spam.

Per-row `saveStatus`: `idle` → `saving` → `saved` (2s) → `idle`, or `error` on failure.

Navigating away from the manage page with **dirty drafts or pending debounce timers** opens `ConfirmDialog` (`categories.unsavedChanges`).

## Reordering

1. User drags row by handle (or taps arrows on mobile).
2. Local order updates immediately (optimistic).
3. `PATCH /categories/reorder` with `{ items: [{ id, order }] }`.
4. Rollback on API error.

During reorder, row inputs disable (`reordering` flag).

## CSS tokens

| Class | Purpose |
|-------|---------|
| `.category-icon-picker-grid` | 4-column icon grid in popover |
| `.category-icon-picker-cell` | Icon picker cell |
| `.category-icon-picker-cell-selected` | Selected picker cell |
| `.category-manager-row-dragging` | Row opacity while dragging |

## i18n keys (`categories.*`)

| Key | Usage |
|-----|-------|
| `manageTitle`, `manageHint` | Header copy |
| `reorderHint` | Drag / arrow hint below title |
| `pickIcon`, `dragToReorder` | A11y labels |
| `savedBadge`, `pendingBadge` | Row auto-save confirmation |
| `unsavedChanges`, `unsavedChangesDescription` | Navigate-away guard |
| `backToCategories` | Page back link |

## Files

| File | Role |
|------|------|
| `components/CategoryManagerEditor.tsx` | List, add form, DnD, auto-save |
| `components/CategoryIconPicker.tsx` | Visual icon grid popover |
| `components/CategoryManagePage.tsx` | Full-page chrome |
| `components/SettingsDialog.tsx` | Entry link to manage page |
| `app/(app)/categories/manage/page.tsx` | Server route + month seed |
| `design-system/finance-app.css` | Icon picker grid utilities |
| `lib/icons.ts` | `dragHandle` icon (`SortVertical`) |

## Verification

After UI changes:

1. `pnpm contrast-check` — 0 failures.
2. `pnpm responsive-check` — inspect `.responsive-audit/` at 375px and desktop widths; confirm rows don’t clip names, icon picker fits, page usable in light and dark themes.

## Future ideas (out of scope)

- Search/filter when category count grows significantly.
- Duplicate-name validation inline.
- `@dnd-kit` if native drag proves insufficient on touch devices.
