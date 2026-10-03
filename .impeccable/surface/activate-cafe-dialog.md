---
slug: activate-cafe-dialog
created: 2026-10-03T03-20-00Z
mode: operate
extends: partner-operational-profile-form
related: .impeccable/audit/2026-10-03T03-04-00Z__manager-cafes-me-route-audit.md
---

# Surface brief — Activate cafe dialog

## Job and audience

A Manager who has finished configuring their operational profile and wants to flip the cafe from `DATA_BLANK` to `ACTIVE`. Reached from a single in-page CTA on `/manager/operational-profile`. Visitor mode: Operate. The manager's state of mind is "I've done the setup; now make the cafe live." Most managers arrive once.

## Outcome and proof

Primary task: confirm the activation and submit the state-change. Success: the cafe flips to `ACTIVE`, the page re-renders, and the primary CTA becomes "Lưu hồ sơ vận hành" (the standard save). Proof: a `Đã lưu lúc HH:mm`-equivalent stamp under the page header reads `Đã kích hoạt lúc HH:mm`, and the cafe's `operationalStatus` becomes `ACTIVE`. Real product-specific truth: the backend returns `canActivate: boolean` + `activationBlockers: string[]` — the dialog is **only opened** when `canActivate=true`; otherwise the CTA is disabled and the blockers are listed inline below it.

## Selected direction

Inherit the polished form's world: white card on neutral ground, cinnabar-as-affordance, Be Vietnam Pro small-caps for sub-labels, `bg-primary text-primary-foreground` for the primary action. The dialog is an `AlertDialog` (focus-protecting: activation is irreversible-ish), `max-w-md` (a hair wider than the existing server-error dialog to fit a short blocker list), with three regions: header (icon + title + subtitle), body (verification copy in calm prose), footer (Cancel outline + "Kích hoạt quán" primary). The inline blocker list below the disabled CTA uses `text-xs text-destructive` rows preceded by a 4-pt cinnabar dot, not bullets. The submit button's label is **state-conditional**: "Lưu hồ sơ vận hành" when ACTIVE, "Kích hoạt quán" when DATA_BLANK and eligible, "Kích hoạt quán" (disabled) when DATA_BLANK and ineligible.

## Scope and boundaries

Fidelity: production-ready dialog (build it for real, not a sketch). Breadth: this dialog only — the close/reopen dialogs are separate surface briefs. Interactivity: button → dialog → confirm → POST → status update; no preview, no intermediate steps. Named target: `src/features/manager-cafe/components/activate-cafe-dialog.tsx` + `src/features/manager-cafe/hooks/useCafeMe.ts` + `src/features/manager-cafe/services/manager-cafe.service.ts` (per the audit). Anti-goals: do not add a status banner (the submit promotion IS the affordance); do not add a close/reopen dialog in this pass; do not surface activation as a separate page; do not change the form's read-only sections.

## States and ranges

- **Trigger state A** — `status = DATA_BLANK`, `canActivate = true`: button reads "Kích hoạt quán", primary scarlet, opens the dialog.
- **Trigger state B** — `status = DATA_BLANK`, `canActivate = false`: button reads "Kích hoạt quán", disabled (neutral-200 fill), inline blocker list directly below, scroll position unchanged, no dialog opens.
- **Trigger state C** — `status = ACTIVE`: button reads "Lưu hồ sơ vận hành", the standard save.
- **Other states** — `INACTIVE`, `BANNED`, `SUSPENDED`: button reads "Lưu hồ sơ vận hành", the standard save; activate is not offered.
- **Dialog states** — closed (default), open with confirmation copy, submitting (button busy), success (closes + updates status), error (server-error pattern from the polished form: dialog stays open with an error alert and "Thử lại" + "Đóng" buttons; no popup-on-popup).
- **Content ranges** — blocker list is 0–5 items (typical 0–3). Confirmation copy is 2 short sentences.

## Interaction and layout

Hierarchy: dialog title is the action ("Kích hoạt cơ sở?"), subtitle names the consequence in one sentence ("Khách sẽ thấy quán của bạn trên Boardverse và có thể đặt bàn."). Body: a small "Điều kiện đã đạt" checklist (the three required profile fields: Hồ sơ vận hành đã lưu, Giờ hoạt động đã thiết lập, Sơ đồ bàn đã cấu hình — the exact list comes from the backend), each row with a green tick. Footer: Cancel (outline) + Kích hoạt quán (primary). On submit success: dialog closes, the hook invalidates the `manager-cafe-me` query, the page re-renders, the banner-timestamp under the page header updates to `Đã kích hoạt lúc HH:mm`, and the submit button label switches to "Lưu hồ sơ vận hành". On submit failure (rare — typically network): dialog stays open, error alert above the footer, "Thử lại" + "Đóng" affordances. Responsive: the dialog is centered, `max-w-md` on desktop and full-width minus 16-px gutters on mobile (`<sm`); the footer stacks Cancel above the primary on mobile (`flex-col-reverse`).

## Constraints and open decisions

- **Service layer**: must build `ManagerCafeService` per the audit (`src/features/manager-cafe/services/manager-cafe.service.ts`) — `activate()` calls `POST /api/manager/cafes/me/activate`. Do not reuse `PartnerService`.
- **Hook layer**: must build `useCafeMe` (`src/features/manager-cafe/hooks/useCafeMe.ts`) — TanStack Query reading `GET /api/manager/cafes/me`, returning `{ cafe, canActivate, activationBlockers }`. The polished form's `useOperationalProfile` should expose the cafe's `operationalStatus` from this hook (or merge it in).
- **Polished form**: the submit row's label and disabled state become conditional on `operationalStatus` + `canActivate`. The inline blocker list is a new small component that lives in the form's submit row.
- **No new DESIGN.md change** — the dialog inherits the polished form's world. The only system-level note is: a status-conditional submit row is now a recognized pattern, not a one-off (worth recording in DESIGN.md on finish).
- **Reuse**: `AlertDialog` and `Button` primitives from `src/components/ui/`; `Loader2`, `Check` icons from `lucide-react`; the `cn` utility. No new shared components.
- **Open decision (confirm with backend team)**: confirm `GET /api/manager/cafes/me` returns `canActivate` + `activationBlockers`. If it doesn't, the disabled-CTA branch falls back to "trust the server" and the inline blocker list is hidden; the dialog shows the server's error message on POST failure instead.

## Direction contract

THESIS: activation is a confirmation, not a celebration — the dialog earns one focus-protected interrupt, no more.

OWN-WORLD: inherits the polished form — `bg-white border-neutral-200 rounded-xl`, cinnabar `bg-primary text-primary-foreground` primary, `text-xs font-semibold text-neutral-500 uppercase tracking-wider` sub-labels, Vietnamese declarative prose, monospace tabular-nums timestamps.

STORY: the manager reads the conditions (three ticked rows), confirms, the cafe flips, the page returns to its standard save rhythm.

FIRST VIEWPORT: a single AlertDialog centered on the form, `max-w-md`, three regions (icon+title+subtitle header, body with the three-row checklist, footer with Cancel outline + Kích hoạt quán primary); form's submit button below the form reads "Kích hoạt quán" in scarlet; if ineligible, the button is disabled and a 1–5 row list of blockers appears directly below in destructive text with cinnabar dots.

FORM: state-conditional submit button label + disabled state; AlertDialog on confirm; status update + timestamp on success; no banners, no separate surfaces.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md (one new line: status-conditional submit row is a system pattern), and every shipping raster carrying its provenance.