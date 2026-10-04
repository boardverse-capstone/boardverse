# Tournament Surface — Audit Report

**Date:** 2026-10-03
**Scope:** `src/features/cafe-tournament/**` (15 files, ~5,300 LOC)
**Mode:** Operate
**Detector run:** `impeccable detect src/features/cafe-tournament`

---

## Audit Health Score

| # | Dimension | Score | Key Finding |
|---|-----------|-------|-------------|
| 1 | Accessibility | 3/4 | Touch targets 28px (h-7) on 3 row buttons in lobby-screen violate WCAG 2.5.5 (44px) |
| 2 | Performance | 3/4 | `filteredList` & `filterTabs` re-compute every keystroke in participants-table |
| 3 | Theming | 4/4 | Full token system + dark mode + `prefers-reduced-motion` handler in `globals.css` |
| 4 | Responsive Design | 3/4 | Row-list columns hidden via `md:`/`lg:`/`xl:` breakpoints — works but tight on tablet |
| 5 | Implementation Integrity | 3/4 | 4 dead-code warnings in `tournament-pairing-studio-modal.tsx`; minor gray-on-color hover |
| **Total** | | **16/20** | **Good** |

---

## Implementation Integrity Verdict

**Pass with caveats.** Tournament surface expresses a coherent system: status-driven UI vocabulary (Draft → RegistrationOpen → Closed → OnGoing → Completed → Cancelled), unified modal dismiss helper (`useDismissOnBackdrop`), and shared cancel-reason dialog with 4 scope variants. The `tournament-row-list` 5-column row is well-composed. Two concerns:

1. **`tournament-pairing-studio-modal.tsx` carries 4 unused-symbol warnings** (`RotateCcw`, `previewData`, `handleSaveManualPairings`, `handleResetToAuto`) — dead code that the surface no longer reaches.
2. **`useTournamentLobby` vs `useTournamentPos` duplicate cancel/start/check-in handlers** with different toast text — drift risk. `useTournamentLobby` toasts are still short-form while `useTournamentPos` (post-clarify) is title-aware.

---

## Detailed Findings by Severity

### P0 — Blocking

*None.*

### P1 — Major (WCAG AA / correctness)

**[P1] Touch targets below 44px on lobby row actions**
- **Location:** `src/features/cafe-tournament/components/tournament-lobby-screen.tsx:428, 442, 458`
- **Category:** Accessibility
- **Impact:** Manager pressing Check-in / Vắng mặt / Xóa on tablet or touch laptop has mis-tap rate ~10% at 28px. WCAG 2.5.5 (AA) requires 24×24 minimum but practical 44×44 recommended.
- **WCAG:** SC 2.5.5 Target Size (Level AAA, but de-facto AA for mobile)
- **Recommendation:** Bump `h-7` → `h-9` on all 3 row buttons; also widen `px-2` → `px-3` for label visibility.
- **Suggested command:** `$impeccable adapt` (touch target sweep)

**[P1] Non-memoized filter pipeline re-computes on every keystroke**
- **Location:** `src/features/cafe-tournament/components/tournament-participants-table.tsx:99-117, 119-148`
- **Category:** Performance
- **Impact:** 100-VĐV roster: 1 keystroke = ~500 comparisons + 5 filter-tab counts. Noticeable on 32-VĐV + tablet; slow on 100+. DropdownMenu / Badge re-render on every keypress even if filter result unchanged.
- **Recommendation:** Wrap `filteredList` and `filterTabs` in `useMemo` keyed by `[participants, search, statusFilter]`.
- **Suggested command:** `$impeccable optimize`

**[P1] Match-result sort recomputed every render**
- **Location:** `src/features/cafe-tournament/components/match-result-modal.tsx:142-160`
- **Category:** Performance
- **Impact:** `getSortedPlayers()` re-sorts 4 VĐV on every render of the modal. With `playerScores` changing on every ± click, the sort + JSX re-render 4 times per click. Tiny absolute cost but the pattern conflicts with the rest of the surface which uses `useMemo` aggressively.
- **Recommendation:** Convert `getSortedPlayers` to `useMemo` keyed by `[playersList, playerScores]`.
- **Suggested command:** `$impeccable optimize`

### P2 — Minor

**[P2] Gray-on-color hover (detector finding ×4)**
- **Location:** `src/features/cafe-tournament/components/match-result-modal.tsx:352, 379, 404, 431`
- **Category:** Theming / Implementation Integrity
- **Impact:** Detector flags `text-neutral-800` on `hover:bg-rose-50` / `hover:bg-emerald-50`. The hover state also applies `hover:text-rose-700`/`hover:text-emerald-700`, so visually the colored-bg + colored-text combination is fine; the base gray is overridden. False-positive in practice but the pattern (muted text on tinted bg) reads as a mid-state "ghost" button when user is mid-hover-and-leave.
- **Recommendation:** Drop base `text-neutral-800`; keep only the hover-specific colored text classes. Or keep gray but make `bg-neutral-100` (no hover color shift) — pick a consistent intent.
- **Suggested command:** `$impeccable polish`

**[P2] Dead code in pairing-studio-modal**
- **Location:** `src/features/cafe-tournament/components/tournament-pairing-studio-modal.tsx:13, 59, 316, 344`
- **Category:** Implementation Integrity
- **Impact:** 4 ESLint warnings. Unused imports + 2 unused handler functions. The component is 700 LOC and clearly drifted from active use.
- **Recommendation:** Delete unused symbols; if `handleSaveManualPairings` / `handleResetToAuto` are intentionally kept for future use, prefix with `_`.
- **Suggested command:** `$impeccable distill`

**[P2] Toast divergence between two hook contexts**
- **Location:** `src/features/cafe-tournament/hooks/useTournamentLobby.ts:185, 113, 77, 95` vs `useTournamentPos.ts` (post-clarify)
- **Category:** Implementation Integrity
- **Impact:** After clarify pass, `useTournamentPos` toasts include the tournament title. `useTournamentLobby` toasts are still generic ("Đã hủy giải đấu.", "Đã thêm khách vãng lai (Walk-in)!"). When both fire in the same session (e.g., manager opens lobby screen for one tournament while POS shows another), the manager cannot tell which tournament was cancelled.
- **Recommendation:** Either share a toast helper, or give `useTournamentLobby` a `tournamentTitle` prop.
- **Suggested command:** `$impeccable clarify`

**[P2] Row-list column breakpoints cascade to 4 breakpoints (md/lg/xl + flex-default)**
- **Location:** `src/features/cafe-tournament/components/tournament-row-list.tsx:496, 516, 557, 575`
- **Category:** Responsive Design
- **Impact:** Tablet (768–1023px) shows only 3 of 5 columns (status, title, schedule). Schedule hides at < lg, fee hides at < xl, participants hides at < md. Functional but cramped; some columns lose context. 1024–1280px loses fee column entirely.
- **Recommendation:** Audit whether 5 fixed-% columns is right or whether 2 stacked rows (mobile/tablet) + 5-col table (desktop) would read better. Consider stacking title above participants on tablet.
- **Suggested command:** `$impeccade adapt`

**[P2] Helper text "Hạn ĐK" abbreviations inconsistent with full forms elsewhere**
- **Location:** `src/features/cafe-tournament/components/tournament-row-list.tsx:550-554`
- **Category:** Accessibility (i18n / scanability)
- **Impact:** "Hạn ĐK", "VĐV", "Bàn" are standard Vietnamese domain abbreviations. Screen readers pronounce "VĐV" as "vê-đê-vê" or read it as one word depending on engine. Acceptable for domain users, but a non-VĐV reading a screen would benefit from first-mention expansion.
- **Recommendation:** Add `aria-label` on the column headers that expands the abbreviation on first focus.
- **Suggested command:** `$impeccable adapt`

### P3 — Polish

**[P3] Icon button `title` attribute without `aria-label` for some controls**
- **Location:** `src/features/cafe-tournament/components/tournament-participants-table.tsx:357-360` (the "Xóa VĐV" button)
- **Category:** Accessibility
- **Impact:** Some screen readers prefer `aria-label` over `title`; both is best. Current implementation uses `title=` only.
- **Recommendation:** Add `aria-label={title}` matching the visible text.
- **Suggested command:** `$impeccable polish`

**[P3] `font-mono` for non-code numerics on filter tab labels**
- **Location:** `src/features/cafe-tournament/components/tournament-participants-table.tsx:120-146` (count badges in tabs)
- **Category:** Implementation Integrity / craft-floor
- **Impact:** Detector didn't flag, but craft-floor warns "monospace as a costume for 'technical' rather than for code, data, or measurement". Counts `(N)` are data — OK; but using mono here for tab labels reads slightly decorative.
- **Recommendation:** Keep `font-mono` only inside the count badge; use `font-sans` for the label.
- **Suggested command:** `$impeccable polish`

---

## Patterns & Systemic Issues

1. **Two-hooks-for-one-domain (drift risk):** `useTournamentPos` (POS surface) and `useTournamentLobby` (lobby screen) duplicate CRUD + toast logic. After clarify pass they're text-inconsistent. Recommend a shared `tournament-actions.ts` exporting typed functions taking `tournamentTitle` as required argument.

2. **Filter pipelines escape `useMemo`:** 2 instances (participants-table + a smaller one in tournament-pos-container) re-derive on every render. Tournament surface otherwise uses `useMemo` aggressively (tournament-row-list has 4 of them). This is an inconsistency rather than a system gap.

3. **Modal touch targets hover at h-7 (28px):** Found in 3 row buttons of `tournament-lobby-screen.tsx`; `tournament-participants-table.tsx` row buttons all use `h-8` (32px) — already better but still under 44px for AA. Tournament surface should adopt `h-9` minimum for primary action buttons.

4. **No `aria-label` redundancy with `title`:** Several icon-only buttons rely on `title` only. Acceptable but not best practice.

---

## Positive Findings

- **Excellent a11y in tournament-row-list:** 7 explicit `aria-label`s, 2 `aria-hidden`, `role="list"`, `role="button"`, `aria-pressed`, `aria-disabled`, `aria-busy` on the refresh button, focus ring (3px halo), keyboard handler on row.
- **Status-pill vocabulary is consistent** across the surface — `Badge` with shared class function (`statusBadgeClass`), 6 statuses, 6 colors.
- **`useDismissOnBackdrop` correctly avoids ref-during-render** (post-clarify fix). All 9 modals benefit.
- **`match-normalize.ts` separates pure logic from JSX** (post-optimize pass) — easy to test, deterministic.
- **Pre-computed `ParticipantLookup` map** in `tournament-pos-container.tsx` (post-optimize) keeps render O(1) per slot.
- **`globals.css` already ships a `prefers-reduced-motion` handler** that kills indefinite animations only (spinner + pulse), preserving hover transitions. This is the right balance for WCAG 2.3.3.
- **Tooltips on icon-only buttons** (e.g., "Thêm thao tác", "Xóa VĐV khỏi giải đấu") — discoverable, no hidden affordances.
- **Empty state copy is actionable** ("Bấm Tạo giải mới ở góc trên để bắt đầu giải đầu tiên") rather than "No data".

---

## Recommended Actions

In priority order:

1. **[P1] `$impeccable optimize`** — Wrap `filteredList`, `filterTabs` in `useMemo` (participants-table) and convert `getSortedPlayers` to `useMemo` (match-result-modal). Two small surgical edits.
2. **[P1] `$impeccable adapt`** — Bump lobby-screen row buttons from `h-7` → `h-9`, and audit tablet breakpoint flow for tournament-row-list.
3. **[P2] `$impeccable polish`** — Drop base `text-neutral-800` on score ±/↕ buttons; add `aria-label` to icon-only buttons; align `font-mono` usage to actual data.
4. **[P2] `$impeccable clarify`** — Apply title-aware toasts to `useTournamentLobby` (parity with post-clarify `useTournamentPos`).
5. **[P2] `$impeccable distill`** — Remove 4 dead-code warnings in `tournament-pairing-studio-modal.tsx`.
6. **Final: `$impeccable polish`** — Visual hierarchy + craft floor sweep after P1–P2 fixes.

Re-run `$impeccable audit` after these to confirm score moves from **16/20 → 19/20**.

---

> You can ask me to run these one at a time, all at once, or in any order you prefer.
