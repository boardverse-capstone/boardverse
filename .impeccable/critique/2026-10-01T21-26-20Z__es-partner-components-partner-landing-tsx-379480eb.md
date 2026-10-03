---
target: src/features/partner/components/partner-landing.tsx
total_score: 14
max_score: 28
na_heuristics: 7,9,10
p0_count: 1
p1_count: 3
target_identity: "file:T:\\FOR_STUDY\\MOOC_9\\SEP_CODE\\boardverse\\src\\features\\partner\\components\\partner-landing.tsx"
target_fingerprint: "sha256:767825508c949763a7b809791c39129d277db56225e29c8a90f1b092d342b8de"
target_path: "T:\\FOR_STUDY\\MOOC_9\\SEP_CODE\\boardverse\\src\\features\\partner\\components\\partner-landing.tsx"
timestamp: 2026-10-01T21-26-20Z
slug: es-partner-components-partner-landing-tsx-379480eb
---
# Critique: src/features/partner/components/partner-landing.tsx

⚠️ DEGRADED: dual-agent, partial (Assessment B browser mutation injection blocked by IDE webview harness — `Runtime.evaluate` rejected with "Invalid parameters"; CLI detector ran clean; accessibility tree + screenshots used as fallback evidence).

## Method

- Assessment A (design review): sub-agent — [Design Review](893af960-663f-4b13-8d1e-322db0f03716)
- Assessment B (detector + browser): sub-agent — [Detector + Browser](e96ef7d4-b85e-4e6a-9241-80fb2ef9f2f8)
- Target slug: `es-partner-components-partner-landing-tsx-379480eb`
- Live URL: `http://localhost:3000/partner`
- Note: A prior critique of this same target closed on 2026-10-01T20-41-28Z at score 21/32 (heuristics 7, 9 n/a → max 32). The file has been substantively edited since then (380 insertions, 153 deletions); this run is a fresh critique against the current source, not an inheritance of the prior snapshot's P0/P1. Trend score is a like-for-like comparison.

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | Sticky nav has no active-section indicator on scroll; CTA buttons give no feedback beyond color shift on hover/focus; no scroll-progress bar. |
| 2 | Match System / Real World | 3 | Vietnamese copy is domain-faithful (`phiên chơi`, `bracket`, `box`, `checkout`, `kho board game`, `thẻ thành viên`); `vũ trụ` metaphor is a stretch but legible. |
| 3 | User Control and Freedom | 2 | No skip-to-content link, no scroll-to-top, no preview of `/partner/register` form before clicking CTA; only browser back rescues the user. |
| 4 | Consistency and Standards | 1 | Three different CTA labels for the same destination (`Đăng ký ngay` / `Trở thành Đối tác Cafe` / `Đăng ký đối tác`); card padding inconsistent (`p-6` pillars vs. `p-8` features vs. `p-8 md:p-10` CTA); CTA surface colors inconsistent (black tile, yellow, green, white). |
| 5 | Error Prevention | 2 | `Điền form đăng ký trong 5 phút` (line 350) is an unbacked promise with no field preview, document checklist, or failure-mode disclosure; nothing stops user clicking CTA then abandoning at the form. |
| 6 | Recognition Rather Than Recall | 3 | Anchor nav keeps sections reachable; CTA repeated three times; feature titles self-describing (`Hệ thống POS chuẩn cho cafe board game.` / `Media tự động.` / `Dashboard doanh thu theo giờ.`). |
| 7 | Flexibility and Efficiency | n/a | Landing/Persuade surface — no power-user path applies. |
| 8 | Aesthetic and Minimalist Design | 1 | Hero crams 6 tiles in first viewport (1 hero card + 1 black CTA + 4 pillars) before user reads a single feature. Pillar cards duplicate information already in the features section. `text-6xl font-bold tracking-tighter opacity-30` step numbers are decoration. |
| 9 | Error Recovery | n/a | Landing/Persuade surface — no operations to recover from within this component. |
| 10 | Help and Documentation | n/a | Landing/Persuade surface — no in-product help context expected at this level. |
| **Total** | | **14/28 (50%)** | **Acceptable** |

## Design Specificity Verdict

**LLM assessment:** `category-template`. Hero bento uses the canonical 2023-2024 Tailwind pastel-card pattern (cream `#f6f5f1` with mint/peach/pink/amber tint cards in `rounded-3xl` shells) that ships with every Webflow template and shadcn starter. Swap "BoardVerse" for "Notion" or "Linear" and the page reads identically. Vietnamese copy and the phrase `vũ trụ board game` provide surface-level domain specificity, but the visual system, card taxonomy, and bento grid layout are category-interchangeable. No domain primitives (game tiles, timer clocks, board silhouettes, café owner screens) ever appear. The product itself has zero visual identity here. The four pillar cards `Quản lý vận hành / Tổ chức giải đấu / Onboard cùng bạn / Tiếng Việt, đầu tiên` are the exact pattern craft-floor §Refuse bans as "Same-size cards of icon plus heading plus text as the page structure."

**Deterministic scan:** `impeccable detect --json` returned `[]` with exit 0 — clean. The detector has no rules for the anti-patterns this file contains (fabricated metrics shown as live, hardcoded hex colors, missing landmarks, missing aria-hidden on decorative SVG, eyebrow kicker, same-size card sameness, three inconsistent CTA labels, dead-code `.grain` CSS, sequential step numbers as decoration). The detector is therefore not a strong signal here; it confirms absence of design-system-level violations but says nothing about the trust and IA problems that dominate the manual review.

**Browser evidence (passive, no overlay):**
- Accessibility tree at `/partner` confirms 27 refs, 4 interactive, 1 `<h1>`, 4 `<h2>`, 5 `<h3>`. Landmarks present: `<nav>`, `<header>`, `<section id="features">`, `<section id="how">`, `<footer>`. **Missing `<main>` landmark** — entire page content is wrapped in a plain `<div ref={containerRef}>` (line 43).
- Two `<section>` elements (features, how) have no `aria-labelledby` reference to their `<h2>` headings.
- 12 lucide-react icons (`Sparkles`, `Coffee`, `BarChart3`, `Gamepad2`, `Clock`, `Users`, `CheckCircle2`, `ImageIcon`, `ArrowUpRight` ×3) used decoratively lack `aria-hidden="true"`.
- Keyboard tab order: nav CTA receives visible browser-default focus ring; no custom focus-visible suppression.
- Mutation injection (Runtime.evaluate setting `document.title` or appending `<script>`) was rejected by the IDE webview harness with "Invalid parameters" — read-only context. No overlay layer injected. Fallback signal: passive accessibility tree + screenshots.

## Overall Impression

A competent, restrained bento landing with fluent Vietnamese that has cleaned up its earlier AI-assistant claims but introduced a *worse* trust violation: a 12-bar dashboard chart with hardcoded values `[40, 65, 50, 80, 95, 70, 55, 75, 90, 60, 45, 70]` and four POS stat cards `8/12`, `3`, `5`, `2.4tr` that look exactly like live operational data — but no café is live. The single biggest opportunity is to either prove these numbers are real (connect to live POS) or label them as illustrative honestly. The score held steady at 14/28 because heuristics 4 (consistency) and 8 (minimalism) regressed: three different CTA phrasings, a hero that crams 6 tiles in one viewport, and four pillar cards that violate the craft-floor ban on same-size cards. Polish pass removed the AI slop from copy but added structural slop to the layout.

## What's Working

1. **Vietnamese-first copy is consistent and domain-faithful.** Every label uses the right term — `phiên chơi` (line 240), `bracket` (line 167), `box` (line 250), `checkout` (line 250), `kho board game` (line 238), `thẻ thành viên` (line 238). The language feels spoken by a café owner, not translated from English.
2. **The hero CTA placement is structurally smart.** Putting `Trở thành Đối tác Cafe` as a tall black tile (line 126-145) adjacent to the hero copy gives the primary action real weight, not a buried button. Even with the labels-inconsistency issue, the layout decision is good.
3. **The dashboard tile uses SignalR-appropriate visual language** (line 296-333) — a real-time bar chart with hour labels `10h → 22h`. When wired to live data this becomes a domain-specific proof rather than generic decoration. The visual language is right; the data behind it is the problem (see P0).

## Priority Issues

### P0 — Fabricated operational data shown without disclosure
- **What:** `partner-landing.tsx` lines 255-274 ship four POS stat cards with hardcoded values (`Bàn trống` → `8/12` line 260, `Đang chơi` → `3` line 261, `Đặt lịch` → `5` line 262, `Doanh thu` → `2.4tr` line 263) inside a card titled `Hệ thống POS chuẩn cho cafe board game.` (line 228). Lines 313-332 ship a 12-bar dashboard chart with hardcoded values `[40, 65, 50, 80, 95, 70, 55, 75, 90, 60, 45, 70]` (line 319) inside a card titled `Dashboard doanh thu theo giờ.` (line 303). Neither has a `[Demo]` / `[Dữ liệu mẫu]` label. The unit on `2.4tr` is hidden so the plausibility of the number is unverifiable.
- **Why it matters:** `PRODUCT.md` line 63 explicitly bans fabricated metrics, fake customers, and fake testimonials. These four stat cards and the bar chart look exactly like live POS data. A Vietnamese café owner evaluating a SaaS will screenshot this and assume it is real. If the product has no live café, this is the single trust-destroying element on the page. craft-floor §Copy: "Claims and configuration come from supplied truth; label illustrative values honestly."
- **Fix:** Three options in order of preference: (1) delete the dashboard chart tile entirely and replace with a static schema (`POS · Giải đấu · Media → Dashboard`); (2) replace the four stat cards with a screenshot of the real back-office with a visible `[Ảnh chụp dashboard thật]` label; (3) add `[Dữ liệu minh hoạ — chưa có quán nào đang chạy]` banner above the chart, change `2.4tr` to `— —` until a real café exists.
- **Suggested command:** `$impeccable audit` (find unbacked claims) + `$impeccable clarify` (label illustrative values honestly).

### P1 — Hero bento violates two craft-floor bans at once (eyebrow + 4 same-size cards)
- **What:** `partner-landing.tsx:108` — eyebrow kicker `<span ... bg-[#fef3c7] text-[#92400e] ...>Chương trình đối tác 2026</span>` directly above the H1. Lines 140-200 — four pillar cards all with identical structure: `bg-[color] rounded-3xl p-6 h-full min-h-[180px] flex flex-col justify-between` + lucide icon + `text-xl font-semibold tracking-tight` title + `text-sm text-neutral-700` description. These four pillars (`Quản lý vận hành / Tổ chức giải đấu / Onboard cùng bạn / Tiếng Việt, đầu tiên`) are also semantically redundant with the features section below (lines 208-334).
- **Why it matters:** craft-floor §Refuse bans both patterns explicitly: "A kicker or eyebrow above a heading. This one is a ban, not a default: no brief earns it back." and "Same-size cards of icon plus heading plus text as the page structure. Cards are the lazy container; nested cards are always wrong." These two bans are the exact recipe for a generic SaaS landing.
- **Fix:** Delete the `Chương trình đối tác 2026` badge entirely. Merge the four pillars into the features section; pick two (POS + Tournament) for the hero, drop the other two. The hero should be: headline + one supporting line + one CTA. Nothing else.
- **Suggested command:** `$impeccable distill` (remove redundancy) + `$impeccable layout` (audit grid for category sameness).

### P1 — Three different labels for the same CTA destination
- **What:** Three buttons all routing to `/partner/register`:
  - line 89 — `Đăng ký ngay` (nav)
  - line 135 — `Trở thành Đối tác Cafe` (hero tile, larger)
  - line 406 — `Đăng ký đối tác` (footer CTA bar)
- **Why it matters:** Same target, three names. Heuristics 4 (consistency) and 8 (minimalism) both fail. The labels also don't share a root word — `Đăng ký ngay` (verb) / `Trở thành Đối tác Cafe` (noun phrase) / `Đăng ký đối tác` (verb). A user scanning for the register button has to recognize three phrasings.
- **Fix:** Pick one canonical label. Recommended: `Đăng ký đối tác` (most descriptive, present tense). Update nav and footer to match. Keep the hero tile's larger size and supporting text `Gửi hồ sơ · Phê duyệt nhanh` (line 138).
- **Suggested command:** `$impeccable clarify` (one name per action).

### P1 — Missing `<main>` landmark; sections lack `aria-labelledby`
- **What:** `partner-landing.tsx:43` wraps the entire page in a plain `<div ref={containerRef}>` with no `<main>` element. Two `<section>` elements (lines 209 features, 338 how) have no `aria-labelledby` reference to their `<h2>` headings.
- **Why it matters:** Screen-reader and assistive-tech users rely on landmarks to navigate. A page without `<main>` means the primary content cannot be jumped to via the standard landmark rotor. Sections without `aria-labelledby` are announced only by their content, not by their topic. Heuristic 1 (Visibility of System Status) fails for accessibility users.
- **Fix:** Add `<main>` around the hero bento + features + how + final-CTA sections (everything except `<nav>` and `<footer>`). Add `aria-labelledby="features-heading"` to `<section id="features">` and `id="features-heading"` on its `<h2>`; same for `id="how"` / `how-heading`.
- **Suggested command:** `$impeccable harden` (a11y baseline).

### P2 — Hard-coded hex colors bypass Tailwind design tokens
- **What:** `partner-landing.tsx` uses 19+ arbitrary `bg-[#...]` and `text-[#...]` classes across the file: `#f6f5f1` (root bg, nav), `#fef3c7` (badge, pillar 3, step 02), `#d97706` (hero accent, footer period), `#171717` (root text, dark cards), `#262626` (dark hover), `#d1f4d6` (pillar 1, dashboard card, stat tile), `#166534` (pillar 1 text, dashboard text, chart bars), `#fbd1d1` (pillar 2, stat tile), `#991b1b` (pillar 2 text), `#fed7aa` (pillar 4, stat tile), `#9a3412` (pillar 4 text), `#16a34a` (CheckCircle2), `#92400e` (badge, pillar 3). These all map to Tailwind `amber-100/600/800`, `neutral-100/800/900`, `green-100/800/900`, `red-100/800`, `orange-100/800` token families but are written as raw hex.
- **Why it matters:** If the brand palette ever changes, this becomes a 19-place find-and-replace. If the design system adds semantic tokens (`bg-surface-success`, `text-content-primary`), this file won't pick them up. craft-floor §Color: tokens should be semantic, not raw.
- **Fix:** Replace raw hex with Tailwind token classes: `bg-stone-50 text-neutral-900` for the root, `bg-amber-100 text-amber-800` for the badge, `bg-emerald-100 text-emerald-800` for green, `bg-rose-100 text-rose-800` for pink, `bg-orange-100 text-orange-800` for orange. Or, if the project has its own design tokens (check `tailwind.config` + `globals.css`), promote these values there.
- **Suggested command:** `$impeccable colorize` + `$impeccable typeset`.

## Persona Red Flags

**Jordan (First-Timer — primary persona for landing):**
- `partner-landing.tsx:108` — `Chương trình đối tác 2026` badge appears with no prior context. Jordan does not know what "đối tác program" means. He skims past it.
- `:113-117` — `Biến quán cafe của bạn thành vũ trụ board game` — Jordan parses "vũ trụ" literally as "universe" and wonders if this is astronomy software, not POS.
- `:148-200` — Four pillar cards `Quản lý vận hành` / `Tổ chức giải đấu` / `Onboard cùng bạn` / `Tiếng Việt, đầu tiên` repeat words from the H1 and feature section. Jordan wonders if he missed something the first time.
- `:126-145` — Hero CTA `Trở thành Đối tác Cafe` clicks → routes to `/partner/register`. Jordan has no preview of what fields the form asks (no `Form mẫu` link, no document checklist, no field list). He closes the form and leaves.
- `:431` — `© 2026 BoardVerse Platform. Tất cả quyền được bảo lưu.` — no contact email, no support link, no FAQ. Jordan has no way to ask a question before submitting.
- **What breaks:** Jordan cannot verify what the partnership involves before committing, and cannot contact support. Abandonment at the registration click.

**Casey (Distracted Mobile):**
- `:68-99` — Sticky nav's `Đăng ký ngay` button sits at the top of the viewport, unreachable by one-handed thumb.
- `:99-202` — On a 390px viewport the hero bento collapses to single column (col-span-12). The black CTA tile (`Trở thành Đối tác Cafe` at `:135`) drops *below* the headline and prose (`:120`), pushing the real CTA below the fold.
- `:208-334` — The features section requires Casey to scroll past hero + 4 features + 3 steps + CTA bar before finding a clickable `Đăng ký đối tác` at `:406`. Sticky nav's button is the only top-of-screen CTA.
- `:89` / `:135` / `:406` — Three different CTA labels: `Đăng ký ngay` / `Trở thành Đối tác Cafe` / `Đăng ký đối tác`. Casey glances at the screen between bus stops and has to re-parse which one is the "real" register button.
- **What breaks:** Casey has to scroll deep into a 5-section page to find the bottom CTA, or hunt through the sticky nav's small button. No bottom-anchored floating CTA on mobile.

**Riley (Stress Tester):**
- `:260-263` — Stat values `8/12`, `3`, `5`, `2.4tr` look like live data. Riley refreshes — values do not change. Riley opens the same page in two tabs — same values. Riley opens the page in a private window — same values. Riley concludes this is a static landing. Screenshot + tweet: `Is BoardVerse's dashboard actually live or is this a fake?` The unit on `2.4tr` is hidden (VND? USD? Sessions?), so Riley cannot even verify the plausibility of the number.
- `:313-332` — Hardcoded bar chart array `[40, 65, 50, 80, 95, 70, 55, 75, 90, 60, 45, 70]` (`:319`). Same problem: looks like real hourly revenue data, is hardcoded, no `[Demo]` label.
- `:401-405` — `Gửi hồ sơ miễn phí — đội ngũ BoardVerse phản hồi sớm.` The word `sớm` (early/soon) is an SLA with no time bound. Riley has no way to verify it.
- **What breaks:** Riley documents (and may publish) that the only proof-of-product on the landing is fake. This is the highest-leverage red flag because Riley-style reviewers decide B2B SaaS contracts.

## Minor Observations

1. `partner-landing.tsx:113-117` — H1 mixes sans (`Biến quán cafe của bạn thành vũ trụ`) with italic serif (`board game`). The `font-serif italic` utility is applied to one word only; no typeface pair is declared in `tailwind.config` or imported via `next/font`. craft-floor: "A system display face… as the display voice of an own-world page… is a failure, not a fallback."
2. `partner-landing.tsx:263` — Value `2.4tr` is locale-correct (`triệu VND`) but the unit is not visible on the card. Either show `2.4tr VND` or `2,400,000 ₫` to make the claim falsifiable (which feeds back into the P0 trust issue).
3. `partner-landing.tsx:21-37` — `reveal` IntersectionObserver fires once and never re-runs. Page refresh is the only way to re-trigger the entrance animation. On a long bento page this is fine, but the `translateY(16px)` distance is small and the `opacity 0` start state means content is invisible if JS is blocked or slow — fails graceful-degradation.
4. `partner-landing.tsx:56-63` — `.grain` class is defined inside the `<style jsx>` block but is never applied to any element. Dead code; ships 8 lines of CSS that has no consumer.
5. `partner-landing.tsx:348-388` — Three step cards use conditional classNames `s.bg.includes("text-white")` (`:377, :382`) to detect whether the card is dark and apply the right text color. The flag is overloaded: `bg` stores both background class and dark/light state. Splitting into `bg` + `tone` would be cleaner; current code is brittle if a fourth dark card is added.

## Questions to Consider

- The hardcoded POS stat values (`8/12`, `3`, `5`, `2.4tr`) at `:260-263` and the bar chart values (`[40,65,50,80,95,70,55,75,90,60,45,70]`) at `:319` are the only place the landing implies "this product already works." If no café is live yet (`PRODUCT.md` line 63 says no testimonials, no real customers), what does this landing actually prove? Could the dashboard tile be a screenshot of the real back-office with a `Ảnh chụp dashboard thật` label once one café exists, and a static schema diagram (`POS · Giải đấu · Media → Dashboard`) until then?
- The eyebrow `Chương trình đối tác 2026` at `:108` exists only because the year is in the title. If we delete the eyebrow (craft-floor ban), do we lose any meaning the café owner actually needs? The year is decorative; the program name is already in the H1.
- Three different CTA labels for one destination (`:89` / `:135` / `:406`) is either a translation artifact (nav uses imperative `Đăng ký ngay`, hero uses noun phrase, footer uses noun phrase) or a deliberate hierarchy. If hierarchy is the intent, the labels should still share a root word. If not, pick one. Which is it, and is the inconsistency load-bearing?
