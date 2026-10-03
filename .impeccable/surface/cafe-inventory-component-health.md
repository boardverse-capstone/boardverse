---
slug: cafe-inventory-component-health
created: 2026-10-03T04-30-00Z
mode: operate
extends: cafe-inventory
---

# Surface brief — Inventory component health

## Job and audience

A Cafe Manager scanning the inventory at `/manager/inventory` mid-shift, who needs to know at a glance: which games are short on components, what each missing/miscounted piece is worth, and how to fix it without leaving the list. Visitor mode: **Operate**. The manager's state of mind is "I see a damaged deck, I want to set the fee in seconds, I want to keep moving."

## Outcome and proof

Primary task: identify a game's component health from the card and adjust a single component's penalty fee without leaving the list. Success: the inventory card surfaces every component's fee + a one-tap path to edit one fee in seconds. Real product-specific truth: a board game's condition is not "X boxes exist" but "X boxes exist *and* each of the 6 components inside is accounted for" — a game with all 6 boxes but 0 meeples is unrentable. Surfacing component health on the card reframes the inventory from "boxes on a shelf" to "what's actually rentable."

## Selected direction

Inherit the polished inventory's world: `bg-white border border-neutral-200/80 rounded-xl` card, `shadow-[0px_1px_3px_rgba(0,0,0,0.04),0px_1px_2px_rgba(0,0,0,0.02)]`, soft amber-emerald status tokens, `text-[11px] font-bold text-neutral-500 uppercase tracking-tight` sub-labels, monospace tabular-nums on every fee. The component strip is a single horizontal row of pills, `font-mono tabular-nums`, scrollable on overflow (max-width). Each pill is `h-7 px-2 bg-neutral-50 border border-neutral-200/60 rounded-md text-[11px] font-bold text-neutral-700` with a colored leading dot (`bg-emerald-500` when fee > 0, `bg-amber-500` when fee === 0, `bg-red-500` when fee > 0 but the component is named `*missing*` — last one is TBD from upstream data shape). If a game has more than 6 components, render the first 6 and append a `+N` pill that opens the edit dialog scrolled to the component list. The edit dialog stays largely the same; one new affordance is added: each component row now has a `✓` confirm chip to save that one row without going through the whole-form submit.

## Scope and boundaries

- **Fidelity:** production-ready (built into the live surface).
- **Breadth:** `inventory-card.tsx`, `edit-game-dialog.tsx`, `useInventory.ts`. No new routes, no new API contracts (BE only supports full-PUT-on-row-save, see Constraints).
- **Named target:** `src/features/cafe-inventory/**`.
- **Untouched:** the 9 inventory API endpoints (kept as-is), BE status enum, role gating on the inventory card, soft-delete / restore flow, the master-game bulk-add dialog, the search / filter / pagination / sort controls.
- **Anti-goals:** no "sync-needed" badge (data shape doesn't expose a `needsReview` flag; fabricating one would mislead); no per-component ✓ outside the edit dialog (the strip is a summary, not an editor); no redesign of the inventory card body (component strip is additive below the existing meta row, not replacing it).

## States and ranges

- **No components** — `penalties.length === 0` — pill row renders nothing; status badge stays.
- **1-6 components** — render all as pills.
- **7+ components** — render first 6 + `+N` overflow pill that opens the edit dialog.
- **Component with `penaltyFee === 0`** — pill leading dot is amber), banner on the whole game's penalty? No, just the dot.
- **Component with a long name** — pill truncates with `[overflow-wrap:anywhere]`, fee slot stays right-aligned.
- **Per-row ✓ busy state** — the chip turns into a spinner for the duration of the PUT, the input disables, the rest of the dialog stays interactive so the manager can keep editing other rows.
- **Per-row ✓ error** — inline error under the row (12px, destructive red), no toast (toast is for whole-form success), the input re-focuses for retry.
- **Permission** — staff role cannot edit fees; the ✓ chip is hidden, the input becomes read-only.

## Interaction and layout

- **Card hierarchy (new order):** name → status badge → component strip (NEW, secondary, top of stack) → box count chip (demoted to tertiary).
- **Component strip:** horizontal flex, `gap-1.5`, `overflow-x-auto` on container for the rare long list, `scrollbar-thin` (no visible scrollbar by default but accessible). Each pill is `shrink-0` so it never wraps mid-name.
- **Pill anatomy:** `bg-neutral-50 border border-neutral-200/60 rounded-md h-7 px-2 text-[11px] font-bold` — leading 6-pt dot + component name (truncated to 8 chars + ellipsis if name > 8 chars) + `·` + `formatVND(fee)` in `tabular-nums font-mono`. Pill background tints amber-50 if fee === 0.
- **Edit dialog:** each component row now reads `[name · Input · ✓]`. Click ✓ → PUT with the full array (current row's fee updated, others unchanged), inline spinner during flight, success shows the ✓ icon for 1.5s before settling, failure shows inline error and unfocuses.
- **Affordances:** every ✓ has hover (subtle scale or shadow), focus-visible (ring-1), active, disabled, loading states. The whole-form `Lưu thay đổi` stays for bulk edits.
- **Responsive:** card component strip collapses to a `+N more` pill on `<sm`; on mobile the per-row ✓ lives in a swipe-revealed panel.
- **Feedback:** per-component save triggers inline spinner then ✓ for 1.5s; whole-form save stays with toast.
- **No animation in this pass** — defer to a dedicated `animate` pass.

## Constraints and open decisions

- **Platform:** Next.js 16 App Router, React 19, Tailwind, shadcn/ui primitives — already in use across the inventory.
- **API contract:** BE only supports `PUT /api/cafes/{cafeId}/inventory/{inventoryId}` with the full `componentPenalties` array (no single-row PATCH). Per-row ✓ therefore composes a full payload: read current row's fee, replace it, send the whole array. **Implementation must read the current `componentPenalties` from local state (already in `penalties` after fetchDetail) and write back the whole array on per-row save.** Sending a partial array is rejected by the validator (`UpdateInventorySchema` requires a full array if the field is present).
- **Accessibility:** every new pill needs `aria-label` (e.g. `Meeples: phí 12.000đ`). The per-row ✓ button uses the project's no-`onClick`-without-`type="button"` convention. Focus order: card → strip pill → edit dialog row → per-row ✓.
- **Localization:** all new copy in Vietnamese; component names from upstream passed through unchanged. `Intl.NumberFormat('vi-VN')` for fee display (matches the existing dialog).
- **Reusable components:** the component pill should live in `components/inventory-component-pill.tsx` so the card and edit dialog can reuse it.
- **No new DESIGN.md change** — this is an extension of the inventory card's existing world. A new line in DESIGN.md on finish: "component strip is a recognized pattern, not a one-off for this surface."
- **Open (verify on finish):** does the BE's GET response include `id` (a separate DB primary key) alongside `gameComponentTemplateId`? If yes, use `id` as the React `key` (already does in the dialog). If no, use `gameComponentTemplateId`. Current code uses `item.id || item.gameComponentTemplateId` — keep.

THESIS: a board game's condition is its components, not its box count; surface component health on every card and make editing one fee a one-click action.

OWN-WORLD: inherits the polished inventory — `bg-white border-neutral-200/80 rounded-xl` card, `shadow-[0px_1px_3px...]`, amber-emerald tokens, monospace tabular-nums fees, Vietnamese declarative copy.

STORY: the manager scans the list, sees which games have 0-fee components, opens the edit dialog, clicks ✓ next to the one row they need, the dialog stays open, the rest of the work continues.

FIRST VIEWPORT: every inventory card now shows a horizontal pill strip directly below the name + status badge; the strip shows 1-6 components as `[● Name · 12.000đ]` pills, the 7th onward is hidden behind a `+N` pill that opens the dialog.

FORM: extension to existing inventory card + edit dialog. No new world, no new identity.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md (one new line: component strip is a system pattern), and every shipping raster carrying its provenance.