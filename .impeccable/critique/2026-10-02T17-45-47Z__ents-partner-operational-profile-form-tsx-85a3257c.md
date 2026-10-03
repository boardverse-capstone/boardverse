---
target: manager/operational-profile
total_score: 23
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
p2_count: 2
p3_count: 1
target_identity: "file:T:\\FOR_STUDY\\MOOC_9\\SEP_CODE\\boardverse\\src\\features\\partner\\components\\partner-operational-profile-form.tsx"
target_fingerprint: "sha256:389cff432748f52dec9105a4bda57131fd928fed7e2edab16b7f51e5a70c68e4"
target_path: "T:\\FOR_STUDY\\MOOC_9\\SEP_CODE\\boardverse\\src\\features\\partner\\components\\partner-operational-profile-form.tsx"
timestamp: 2026-10-02T17-45-47Z
slug: ents-partner-operational-profile-form-tsx-85a3257c
---
# Critique: `src/features/partner/components/partner-operational-profile-form.tsx`

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|---|---|---|
| 1 | Visibility of System Status | 2 | No "Saved at HH:mm" stamp after a successful save. Loading pill only fires on initial mount; no fetch-from-save timestamp. |
| 2 | Match Between System and Real World | 3 | By-hour explainer and "khung giờ" are the right register. Read-only fields use the "mục Hỗ trợ" handoff cleanly. |
| 3 | User Control and Freedom | 2 | Validation errors are hidden behind a one-button "Đóng" modal; no in-place focus, no undo, no discard. The modal is a one-way trap. |
| 4 | Consistency and Standards | 3 | Tokens (SUB_LABEL_CLASS, INPUT_SHELL, SECTION_HEADER_CLASS) are coherent. Inconsistency: section I wears a "Chỉ xem" badge, but section II's read-only image gallery and the read-only workingHours block wear no equivalent marker. |
| 5 | Error Prevention | 2 | No live validation. A manager can type 1000 for tieredBlockMinutes and only learn at submit. |
| 6 | Recognition Rather Than Recall | 3 | In-place explainer paragraph is the strongest piece. One inconsistency: the explainer calls the field "Giá cơ bản" while the label says "Giá giờ đầu tiên" — small recall bridge. |
| 7 | Flexibility and Efficiency of Use | 1 | No keyboard shortcuts, no cache of values across billing-model switch, no lightbox on images, no reset-to-defaults. |
| 8 | Aesthetic and Minimalist Design | 3 | Hierarchy is clean (4 Roman-numeral sections, all-caps sub-labels). Crowding: every field has SUB_LABEL_CLASS *and* FieldDescription. "Số phòng riêng (Private Rooms)" + helper repeats the noun three times. |
| 9 | Error Recovery | 2 | describeError is excellent. Presentation throws it away: same dialog as success, same "Đóng" button, no "Thử lại" / "Liên hệ hỗ trợ" affordance. |
| 10 | Help and Documentation | 1 | "Hỗ trợ" named three times in copy but never linked. No "?" popovers. |
| Total | | 23/40 | Acceptable — significant improvements needed before users feel trusted. |

## Design Specificity Verdict

**LLM.** Moderately product-specific. By-hour explainer, "khung giờ" pricing model, the I/II/III/IV Roman-numeral scheme all read "Boardverse". What's missing is atmospheric specificity — no board-game reference, no cafe tone. The dual-error pattern and the lack of saved-state reassurance are choices an unrelated product could ship unchanged. It needs a reason to feel like Boardverse, not a translation of "Operational Profile."

**Deterministic scan.** `impeccable detect --json` returned `[]`, exit 0, 0 findings. The CLI scan is clean; design-specificity issues are not what the detector flags.

**Visual overlays (browser).** Reached the page (already logged in as manager@gmail.com), captured desktop (1280×800) and mobile (390×844). The destructive banner (role="alert" + "Thử lại") sits between the PageHeader and the Card — visually its own band, not part of the form. On the mobile viewport, the "Chỉ xem" badge in section I's header row sits unusually close to the card's right inner padding — a paint artefact of p-8 (32px) on a 390px viewport. No contrast or overflow issues observed. No live overlay was injected (this is $impeccable critique, not $impeccable live).

## What's Working

1. The by-hour pricing explainer paragraph is the single best-written UI text in the form. Names every term it introduces in bold, gives a worked example (60.000đ / 15 phút / 20.000đ), and sits visually attached to the three numeric fields it explains. A first-time manager can read it and complete the fields without documentation.
2. switchBilling correctly purges stale fields. When the user moves from BY_HOUR to PER_DRINK, basePrice, tieredBlockRate, tieredBlockMinutes are cleared. The reverse path clears depositPercentage.
3. describeError in the hook is excellent. Maps /401|403|422|5xx|network/ raw API throws into manager-friendly Vietnamese with no "Error 500" leakage.

## Priority Issues

### [P1] The "Đóng" dialog steals the inline errors and is reused for success
- **Why it matters.** The form's emotional valley. A user clicking Save with empty fields sees inline red text *and* a modal that covers it. The modal is the *same* component as the success dialog — same title font, same "Đóng" button, same dimensions. By Nielsen H3, this fails user control. By the peak-end rule, this is the last thing the user feels before they walk away.
- **Fix.** Drop the modal for client-side validation — trust the inline errors, scroll to the first errored field, focus() it, and surface an inline role="alert" summary above the form ("2 trường cần chỉnh: Số phòng riêng, Tỷ lệ đặt cọc."). Reserve the modal for server-side failures (401/403/5xx/network), and *there* the dialog must offer "Thử lại" + "Liên hệ hỗ trợ" — not just "Đóng". Visually separate the two.
- **Suggested command**: $impeccable shape (split dialog variants) + small $impeccable clarify follow-up to remove the validation modal.

### [P2] Billing-model switch silently destroys user-entered pricing
- **Why it matters.** A manager with basePrice=60000, tieredBlockMinutes=15, tieredBlockRate=20000 clicks "Tính phí theo đồ uống" to compare. The three values vanish. They click "Tính phí theo giờ chơi" again. The values are gone. The handler treats these as throwaway instead of as user intent.
- **Fix.** Cache the last-typed values per billing model in form state (e.g., basePrice_BY_HOUR, depositPercentage_PER_DRINK) so switching back restores them. If that's too much, add a one-line "Đổi mô hình sẽ xóa các giá trị giá hiện tại. Tiếp tục?" confirm.
- **Suggested command**: $impeccable harden.

### [P1] Section II "Hình ảnh không gian" thumbnails are 14×14 dead pixels
- **Why it matters.** 56×56px thumbs, no lightbox, no full-size view, no remove. A cafe with 8 images of its space has to squint. The whole "không gian cơ sở" mental model is "show me what customers will see" — the form shows a postage stamp.
- **Fix.** Promote to a real gallery: 96–120px thumbs, click-to-zoom, optional "xem ảnh" link, and a "yêu cầu thay đổi ảnh qua mục Hỗ trợ" CTA at the bottom. If read-only is firm, reword the section: "II. Không gian (chỉ xem tại đây — chỉnh sửa qua Hỗ trợ)".
- **Suggested command**: $impeccable shape (gallery component) + $impeccable polish.

### [P2] Read-only fields are inconsistently signposted
- **Why it matters.** Section I has a "Chỉ xem" badge. Section II's "Hình ảnh không gian" is also read-only but has no badge. workingHours is read-only. hasGameMaster is editable. A manager wastes effort trying to find a way to change their space photos.
- **Fix.** Apply the "Chỉ xem" badge to any sub-section that's non-editable: workingHours, spaceImageUrls. Wrap each read-only field in the same bg-neutral-50/60 "card-in-card" treatment that the working-hours block already has.
- **Suggested command**: $impeccable polish.

### [P3] The submit button's gradient/inset-shadow is the loudest visual element on the page
- **Why it matters.** The form is monochromatic neutral. The submit button is bg-linear-to-b from-[#2A2A2A] to-[#1A1A1A] with inset highlight + shadow. It is *louder* than the page title. For a settings page, the most clickable thing should be the *submit action*, not the most-decorated thing.
- **Fix.** Use a flat bg-neutral-900 text-white with no gradient and no inset highlight. The form has 4 sections; the submit is a period, not a headline.
- **Suggested command**: $impeccable quieter.

## Persona Red Flags

**Riley (stress tester).** Clicking submit on an empty form pops the same modal that success uses; no debounce, no way to close-without-action. The hydrate-failure alert has no clear "what state am I in?" — disabled submit + empty form + "Thử lại" leaves Riley unsure if data is loaded. Two setField calls in switchBilling fire synchronously in one render (billingModel + clear); on a slow device this stutters.

**Jordan (first-time manager).** The by-hour explainer's worked example uses 60.000đ, but the input field has no VND prefix or suffix — Jordan types "60" and is unsure if that's 60.000đ or 60đ. "Hỗ trợ" is named three times in copy but never rendered as a clickable link. The hasGameMaster checkbox appears in the accessibility snapshot as [checked, readonly] — a Radix artefact, but Jordan's screen reader will announce "checked, read-only" which is contradictory.

**Casey (mobile, 390px).** The by-hour explainer paragraph is text-xs leading-relaxed and sits *between* the section header and the three numeric fields — Casey has to scroll past it on every visit. The "Chỉ xem" badge in section I's header row sits visually pinched against the card's right inner padding on a 390px viewport. The submit button (w-full h-11, 44px tall, full-width) is actually well placed in the thumb zone — that one works.

## Minor Observations

- spaceImageUrls key={`${url}-${idx}`} will mis-key on duplicate URLs. Stress-test finding, not user-facing today.
- The spaceImageUrls <img> opts out of next/image (line 235) with an eslint-disable. If a URL is on Cloudinary, <Image> with width/height would give responsive srcset. Perf miss, not a design one.
- cn(INPUT_SHELL, "pr-14") and cn(INPUT_SHELL, "pr-10") are repeated 3 times. A <CurrencyInput> / <UnitInput> wrapper would halve the JSX.
- SUB_LABEL_CLASS and SECTION_HEADER_CLASS are inline arbitrary values. The design system should have these as tokens.
- The success dialog text-base font-bold on a max-w-sm dialog feels under-typeset for a "you just saved your cafe" moment. Worth a small typeset pass.
- The "Chỉ xem" badge uses text-neutral-400 — borderline AA contrast on white. Use text-neutral-500 or add weight.
- The success dialog's "Mọi thay đổi vừa được áp dụng cho cơ sở của bạn" is the same kind of unprovable reassurance that the previous clarify pass removed "đã sẵn sàng kích hoạt" for. A "Xem hồ sơ vận hành" or "Xem trên trang khách" CTA would make it verifiable.

## Questions to Consider

1. What is this page for? A user can change numberOfPrivateRooms, hasGameMaster, billingModel, and three pricing fields. They *cannot* change their space photos, working hours, or cafe name. 4 of 7 displayable "operational" properties are read-only. Is this a "settings" page or a "pricing" page? If the former, the read-only sections are out of place; if the latter, the section headers should be reworded ("Cấu hình giá & dịch vụ"). A page that can't change most of what it displays is a credibility problem.
2. Why is the billing-model radio the only two-option decision in the product, and yet it has no preview? A manager considering PER_DRINK has no way to see "this would set your deposit at X% by default" or "your by-hour rates would be preserved" without clicking.
3. What would happen if a manager opened this page, ignored everything, and clicked "Lưu hồ sơ vận hành" without changing a thing? It passes validation, PUTs the same payload, opens the success dialog. There's no "Bạn chưa thay đổi gì" guard. A settings page that saves on every click is fine; one that *congratulates* the user for doing nothing is theatre.
4. What if the submit were a real action moment, not a decoration moment? A flat bg-neutral-900, no gradient, no inset highlight.
