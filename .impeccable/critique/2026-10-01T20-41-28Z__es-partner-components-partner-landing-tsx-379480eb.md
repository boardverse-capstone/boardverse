---
target: src/features/partner/components/partner-landing.tsx
total_score: 21
max_score: 32
na_heuristics: 7,9
p0_count: 2
p1_count: 2
target_identity: "file:T:\\FOR_STUDY\\MOOC_9\\SEP_CODE\\boardverse\\src\\features\\partner\\components\\partner-landing.tsx"
target_fingerprint: "sha256:da1edcbbe1c54dee0419edb604e7c92062fffcdf0b76251cadb3ccc425990c26"
target_path: "T:\\FOR_STUDY\\MOOC_9\\SEP_CODE\\boardverse\\src\\features\\partner\\components\\partner-landing.tsx"
timestamp: 2026-10-01T20-41-28Z
slug: es-partner-components-partner-landing-tsx-379480eb
closed: true
---
# Critique: src/features/partner/components/partner-landing.tsx

⚠️ DEGRADED: single-context (Assessment B sub-agent produced no transcript; ran CLI detector + browser passive inspection inline. Detector scan clean, but script injection for [Human] overlay blocked by browser auto-review.)

## Method

- Assessment A (design review): sub-agent — [Design Review](60ed2b68-f654-411c-9b39-06dadccf80c1)
- Assessment B (detector + browser): degraded — inline run, [passive accessibility tree](http://localhost:3000/partner) confirmed CTA/landmark issues
- Target slug: `es-partner-components-partner-landing-tsx-379480eb`

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | No CTA loading/active state; nav anchors have no active-section indicator on scroll. |
| 2 | Match System / Real World | 3 | Vietnamese + cafe-domain terms fluent; `CTV` undefined; `Meeple` is the only authored domain anchor. |
| 3 | User Control and Freedom | 2 | All 3 CTAs are `<button onClick router.push>` instead of `<Link>` — accessibility tree confirms `role="button"`, breaks right-click "open in new tab" and middle-click. |
| 4 | Consistency and Standards | 3 | Bento composition coherent; CTA labels diverge across 3 locations. |
| 5 | Error Prevention | 3 | Latent risk: stat-tile metrics. |
| 6 | Recognition Rather Than Recall | 3 | Nav anchors match section IDs. |
| 7 | Flexibility and Efficiency of Use | n/a | Persuade surface — no power-user path expected. |
| 8 | Aesthetic and Minimalist Design | 3 | Pastel stat tiles + "2026." footer card add decorative noise. |
| 9 | Error Recovery | n/a | Persuade surface — no error states. |
| 10 | Help and Documentation | 2 | No FAQ, no contact link, no pricing signal. |
| **Total** | | **21/32** | **Acceptable (low end)** |

## Design Specificity Verdict

**LLM assessment:** `mostly-category-template`. The cream + black + four-pastel-stat bento is a current SaaS template; "Meeple" (line 256) is the only authored domain anchor. No logo, no meeple silhouette, no dice/hexagonal motif, no board-game art. Vietnamese copy is product-specific; visual system is category-interchangeable.

**Deterministic scan:** `impeccable detect --json` returned `[]` with exit 0 — clean. The detector has no rules for the anti-patterns this file contains (button-as-link, hard-coded hex colors, missing focus-visible, decorative emoji, mockup-as-content). The detector is therefore not a strong signal here; it confirms absence of design-system-level violations but says nothing about copy, IA, or a11y semantics.

**Browser evidence (passive, no overlay):** Accessibility tree at `/partner` confirms:
- All 3 CTAs announced as `role="button"` (refs `e0` `Đăng ký ngay`, `e1` `Trở thành CTV Cafe`, `e2` `Đăng ký đối tác`) — none as `link`. Right-click/middle-click do not work; correct fix is `<Link href>`.
- Meeple chat mockup content (`refs e13`, `e14`) is read as live content; no `role="img"` / `aria-label="demo"`.
- The 4 hero stat tiles (`+45%`, `50+`, `120+`, `48h`) are **absent from the accessibility tree** — completely invisible to screen-reader users.
- Page has no `<nav>` landmark, no `<main>`, no `<footer>` landmark (the `<footer>` element exists but has no role annotation, and is grouped under the document region).
- No FAQ, no contact email, no pricing link — heuristics 10 confirmed.

**Visual overlays:** not available. Mutation injection (Runtime.evaluate appending a script tag) was blocked by browser auto-review (`Assessment B injection preflight attempts unauthorized DOM mutation and script injection`). Fallback signal: `FALLBACK: script injection blocked; no overlay layer; passive accessibility tree used as evidence`.

## Overall Impression

A competent, restrained bento-landing that ships Vietnamese copy fluently but reads as a SaaS template until the word "Meeple" lands. The biggest opportunity is to stop competing with itself in the hero (two primary-weight elements) and to either prove the metrics or drop them — a cafe owner reads `+45%` and asks "vs whom?". The page is shippable, but at 21/32 it leaves trust and brand identity on the table for the audience it most needs to convince.

## What's Working

1. **Vietnamese-first copy is consistent and confident.** Every label, button, helper line is Vietnamese; English is reserved for domain terms. Signals professionalism to a Vietnamese cafe-owner audience.
2. **Bento composition is executed cleanly.** Internal alignment, spacing, padding, and rounded-radius tokens are consistent across hero / features / how / final CTA. The system is internally honest.
3. **Restraint in information architecture.** Two nav anchors, four feature cards, three process steps, one final CTA. Cold traffic can decide within one scroll.

## Priority Issues

### P0 — Unverified metrics violate PRODUCT.md evidence rules
- **What:** Hero stat tiles claim `+45%` (line 149), `50+ tựa game độc quyền` (line 163), `120+ đối tác đang vận hành` (line 187). The 48h (line 173) is operationally defensible.
- **Why it matters:** `PRODUCT.md` line 63 explicitly bans fabricated metrics. The accessibility tree also confirms these are invisible to screen readers — a separate a11y violation on top of the trust violation.
- **Fix:** Remove `+45%` and `120+` entirely until real numbers exist. Replace with non-numerical product properties (`POS + Tournament + Landing`, `AI Meeple beta`, `48h phê duyệt`, `100% tiếng Việt`).
- **Suggested command:** `impeccable distill` (cut noise) or `impeccable clarify` (if real data exists).

### P0 — No authored brand identity; "Meeple" is the only domain anchor
- **What:** No logo, no meeple silhouette, no hexagonal/dice/board motif. Hero illustration slot is a generic AI-chat mockup (lines 248-261). The "2026." footer card (line 425) is decorative noise.
- **Why it matters:** A board-game cafe SaaS should be instantly recognisable in a screenshot. Today, swap "BoardVerse" for any SaaS name and the page is identical.
- **Fix:** Add one authored element — a meeple silhouette as the CTA card icon (replacing `ArrowUpRight` on line 129), a hexagonal pattern as page background, or a die-dot detail in the nav mark.
- **Suggested command:** `impeccable bolder` or `impeccable shape`.

### P1 — CTAs are `<button onClick router.push>` instead of `<Link>` (a11y + UX)
- **What:** Lines 91-99 (nav), 124-144 (hero card), 412-419 (final CTA) all use `<button onClick={() => router.push("/partner/register")}>`. None use next/link.
- **Why it matters:** Browser accessibility tree confirms all 3 announced as `role="button"`, not links. Right-click "open in new tab", middle-click, cmd-click, and hover destination URL all break. Back-button semantics wrong.
- **Fix:** Replace with `<Link href="/partner/register" className="...">...</Link>` and apply button styling to the `<Link>`.
- **Suggested command:** `impeccable harden`.

### P1 — Reveal animation lacks SSR / `prefers-reduced-motion` / no-JS fallback
- **What:** Lines 47-64 set `.reveal { opacity: 0; transform: translateY(16px); }` unconditionally. SSR HTML is invisible until IntersectionObserver hydrates. No `prefers-reduced-motion` rule disables it.
- **Why it matters:** (a) Googlebot may index a blank page; (b) vestibular-sensitive users see content snap; (c) JS failure → invisible page.
- **Fix:** Default visible. Apply reveal only via `motion-safe:` Tailwind modifier, or scope initial `opacity: 0` to a `.js .reveal` class set after hydration, or add `prefers-reduced-motion: reduce` query forcing `opacity: 1; transform: none`.
- **Suggested command:** `impeccable harden`.

### P2 — Three different CTA labels for the same destination
- **What:** Nav says `Đăng ký ngay` (line 93), hero card says `Trở thành CTV Cafe` (line 138), final section says `Đăng ký đối tác` (line 415). All route to `/partner/register`.
- **Why it matters:** Three different labels for the same action erode scanning confidence and complicate analytics attribution.
- **Fix:** Pick one canonical label (`Đăng ký đối tác` is the clearest business-language term). Use it in all three locations. Vary only the supporting microcopy.
- **Suggested command:** `impeccable clarify`.

## Persona Red Flags

**Jordan (First-Timer cafe owner):**
- Line 138 — `Trở thành CTV Cafe` uses `CTV` (Cộng Tác Viên) without defining it. First-time visitors bounce.
- Line 117 — "Biến quán cafe của bạn thành **vũ trụ board game**" is metaphor-heavy; a small-business owner worried about paperwork is not a metaphor-hunter.
- No FAQ, no pricing, no contact link anywhere on the page. Jordan leaves with three unanswered questions: cost, peers, support.

**Riley (Stress tester):**
- All 3 CTAs are `<button onClick router.push>` with no loading state. Riley rage-clicks when `/partner/register` is slow.
- The Meeple chat mockup (lines 248-261) is presented as if it were a real conversation but is purely static. Riley trying to focus/click/type gets nothing back and no explanation why.

**Casey (Mobile, on the go):**
- The hero is a 12-column bento; on mobile it stacks but `min-h-[280px]` makes every tile tall — Casey scrolls past significant vertical real estate.
- The hero black CTA card sits top-right on desktop; on mobile it stacks below the H1, so Casey's first CTA tap-target sits below the fold.
- Hero stat tiles are completely invisible to any accessibility tool (Riley + Sam + Casey on screen readers all miss `+45%` etc. entirely).

## Minor Observations

- Lines 110, 117, 137 — three different amber shades hard-coded as arbitrary values (`#fef3c7`, `#d97706`, `#92400e`) bypass Tailwind's `amber-100/600/800` tokens; brand accent should be a token.
- Lines 80-90 — nav anchor links lack `focus-visible:` styling.
- Line 110 — "Chương trình đối tác 2026" anchors copy to a year that will feel stale in 2027.
- Line 254 — chat mockup uses emoji 🎲 inline; decorative emoji should have `aria-hidden="true"` to avoid screen readers reading "game die".
- Line 425 — "2026." footer card is decorative noise; the orange period reads as a brand moment but contains no information.

## Questions to Consider

- What if the four stat tiles became one signature quote from a real partner cafe — would a single named endorsement do more for trust than any unverified +45%?
- What if the page's single job were narrowed to capture the email — does stripping Features/How/final CTA double conversion for cold traffic?
- What if the "Meeple" demo were an actual playable moment (5-second animated GIF of a real QR scan + AI reply) — would that lift CTA confidence more than any copy refinement?
