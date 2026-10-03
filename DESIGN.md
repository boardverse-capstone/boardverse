---
name: BoardVerse
description: A warm, scarlet-accented back-office for board-game cafés — POS, tournament, partner onboarding — served in Vietnamese.
colors:
  primary: "oklch(0.505 0.213 27.518)"
  primary-foreground: "oklch(0.971 0.013 17.38)"
  destructive: "oklch(0.577 0.245 27.325)"
  background: "oklch(1 0 0)"
  foreground: "oklch(0.153 0.006 107.1)"
  card: "oklch(1 0 0)"
  card-foreground: "oklch(0.153 0.006 107.1)"
  popover: "oklch(1 0 0)"
  popover-foreground: "oklch(0.153 0.006 107.1)"
  secondary: "oklch(0.967 0.001 286.375)"
  secondary-foreground: "oklch(0.21 0.006 285.885)"
  muted: "oklch(0.966 0.005 106.5)"
  muted-foreground: "oklch(0.58 0.031 107.3)"
  accent: "oklch(0.966 0.005 106.5)"
  accent-foreground: "oklch(0.228 0.013 107.4)"
  border: "oklch(0.93 0.007 106.5)"
  input: "oklch(0.93 0.007 106.5)"
  ring: "oklch(0.737 0.021 106.9)"
  label-foreground: "oklch(0.439 0 0)"
  helper-foreground: "oklch(0.556 0 0)"
  section-foreground: "oklch(0.269 0 0)"
  chart-1: "oklch(0.828 0.111 230.318)"
  chart-2: "oklch(0.685 0.169 237.323)"
  chart-3: "oklch(0.588 0.158 241.966)"
  chart-4: "oklch(0.5 0.134 242.749)"
  chart-5: "oklch(0.443 0.11 240.79)"
  sidebar: "oklch(0.985 0.004 106.5)"
  sidebar-foreground: "oklch(0.2 0.012 107.1)"
  sidebar-primary: "oklch(0.505 0.213 27.518)"
  sidebar-primary-foreground: "oklch(0.971 0.013 17.38)"
  sidebar-accent: "oklch(0.962 0.006 106.5)"
  sidebar-accent-foreground: "oklch(0.25 0.014 107.4)"
  sidebar-border: "oklch(0.915 0.008 106.5)"
  sidebar-ring: "oklch(0.737 0.021 106.9)"
  warm-cream: "#F4EFE8"
  warm-cream-deep: "#E8DFCF"
  ink: "#171717"
typography:
  sans:
    fontFamily: "'Be Vietnam Pro', system-ui, sans-serif"
    fontWeight: [100, 200, 300, 400, 500, 600, 700, 800, 900]
  mono:
    fontFamily: "'Geist Mono', ui-monospace, monospace"
  heading:
    fontFamily: "'Be Vietnam Pro', system-ui, sans-serif"
    fontWeight: 600
    letterSpacing: "-0.02em"
rounded:
  sm: "calc(var(--radius) * 0.6)"
  md: "calc(var(--radius) * 0.8)"
  lg: "0.625rem"
  xl: "calc(var(--radius) * 1.4)"
  2xl: "calc(var(--radius) * 1.8)"
  3xl: "calc(var(--radius) * 2.2)"
  4xl: "calc(var(--radius) * 2.6)"
spacing:
  form-control: "h-9"
  form-control-sm: "h-8"
  form-control-lg: "h-10"
  touch-target: "h-11"
  form-control-pad: "px-2.5"
  card-pad: "p-6"
  card-pad-sm: "p-4"
  card-pad-comfort: "p-8"
  card-pad-xl: "p-10"
  sidebar-width: "16rem"
  sidebar-width-icon: "3rem"
  header-height: "h-14"
  header-height-md: "md:h-16"
  container-pad: "p-3 pt-4 sm:p-4 sm:pt-6 md:p-5 lg:p-6"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.md}"
    padding: "0 0.625rem"
    height: "2.25rem"
  button-outline:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    padding: "0 0.625rem"
    height: "2.25rem"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    padding: "0 0.625rem"
    height: "2.25rem"
  button-destructive:
    backgroundColor: "oklch(0.577 0.245 27.325 / 0.10)"
    textColor: "{colors.destructive}"
    rounded: "{rounded.md}"
    padding: "0 0.625rem"
    height: "2.25rem"
  input-default:
    backgroundColor: "transparent"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    padding: "0 0.625rem"
    height: "2.25rem"
  card-default:
    backgroundColor: "{colors.card}"
    textColor: "{colors.card-foreground}"
    rounded: "{rounded.xl}"
    padding: "1.5rem"
  badge-default:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "9999px"
    padding: "0 0.5rem"
    height: "1.25rem"
---

# Design System: BoardVerse

## Overview

**Creative North Star: "The Board-Game Café at Office Hours"**

BoardVerse is a back-office for a Vietnamese board-game café during a working shift. The aesthetic is the warmth of a neighborhood parlor — wood, cream paper, a single scarlet accent — translated into a tool that staff and owners can run without ceremony. The product is operational, not aspirational: pages are organized as a ledger, copy is in Vietnamese, and the only "design" the user feels is that the surface has been considered. The brand lives in a single color (scarlet) and a single typeface (Be Vietnam Pro), not in ornament.

**Personality:** warm, Vietnamese-first, ledger-like. Dense enough to hold a working session; generous enough to let the user breathe. The interface recedes; the work advances.

**Tone of voice:** operational clarity. Vietnamese copy throughout the back-office. Marketing-speak and puffery are absent; claims are concrete and verifiable ("Đã lưu hồ sơ vận hành" rather than "Mọi thứ sẵn sàng"). English reserved for international terminology (session, checkout, bracket, settle).

**Visual anti-references:** gradient text as decoration, glassmorphism as a default, neon "block-shadow" buttons, illustration-as-imitation-of-photography, 2010s admin-template bevels and inset highlights. Each of these appears in a few feature files and is an exception, not a pattern.

**Key Characteristics:**
- **One accent color.** Scarlet (cinnabar, oklch 0.505 0.213 27.518) is reserved for primary actions and brand surfaces. The neutral palette does the rest of the work.
- **One typeface.** Be Vietnam Pro carries body, headings, and labels. No display face; no system fallback as a default.
- **Flat with focus.** Surfaces are flat at rest. The 1px ring + 3px focus shadow is the only depth signal on most controls. Modals and popovers earn their shadow.
- **Generous padding.** Cards pad at 24–40px. Inputs are 36px tall (touch target 44px). The form breathes.
- **Vietnamese-first copy.** Every label, button, error, and message is in Vietnamese. The English words that appear (POS, checkout, bracket) are terms of art, not style.

## Colors

The palette is monochrome with a single accent. Neutrals run from white (`oklch(1 0 0)`) to ink (`oklch(0.153 0.006 107.1)`) with warm-tinted mid-grays (the OKLCH hue 107° reads as a slight yellow-green, which is the "warm cream paper" feel of the system). The accent is a saturated cinnabar — the scarlet of lacquered wood and traditional Vietnamese đỏ son.

### Primary
- **Cinnabar Scarlet** (`oklch(0.505 0.213 27.518)`, ≈ `#C10007`): the brand color. Used on primary action buttons, the active nav item, the "saved" badge, and any element that needs to read as a confident decision. Never as a background. Never as a chart bar.
- **Cinnabar Scarlet (dark)** (`oklch(0.444 0.177 26.899)`, ≈ `#9F0712`): the dark-mode primary, one notch deeper so the same red reads on a near-black background.

### Secondary / Muted / Accent
- **Cool Paper** (`oklch(0.967 0.001 286.375)`, ≈ `#F4F4F5`): the secondary surface. Used for the soft `bg-muted` in tab strips, hover states, and section dividers.
- **Warm Paper** (`oklch(0.966 0.005 106.5)`, ≈ `#F4F4F0`): the accent and muted surface. The faint warm tint is the only color signal between "white" and "neutral."
- **Ink (Foreground)** (`oklch(0.153 0.006 107.1)`, ≈ `#0C0C09`): the text color, used at 80% opacity for secondary text and at full for headings and primary copy.

### Decorative warm cream (named exception)
- **Cream Paper** (`#F4EFE8`): used only on the decorative aside of the login form and on the partner-landing hero. This is a **decorative surface only**, not a back-office page background.
- **Cream Deep** (`#E8DFCF`): a single shade deeper, used for the framed Board-game.png on the login aside.

### Borders & inputs
- **Hairline** (`oklch(0.93 0.007 106.5)`, ≈ `#E8E8E3`): the default border. Warm-tinted so it doesn't read as a cold divider.
- **Ring** (`oklch(0.737 0.021 106.9)`, ≈ `#ABAB9C`): the focus ring color. Used as a 1px border + 3px halo (`ring-ring/50`).

### Chart colors
- **Sky → Deep Blue** (chart-1 through chart-5): a five-stop blue ramp from `oklch(0.828 0.111 230.318)` to `oklch(0.443 0.11 240.79)`. Used in Recharts visualizations (POS revenue, tournament stats, partner reports). The only place the system uses a non-scarlet non-neutral hue.

### Destructive
- **Signal Red** (`oklch(0.577 0.245 27.325)`, ≈ `#E7000B`): destructive actions, error states, and the alert banner. Shares the scarlet hue family but at higher chroma, so destructive reads as "louder scarlet" rather than "different color." Dark-mode destructive is `oklch(0.704 0.191 22.216)` — a vermilion that pops on the dark card surface.

### Named Rules

**The Cinnabar Rule.** Scarlet is for brand and primary CTAs only — never for backgrounds, banners, chart bars, or decorative fills. Its rarity is the point. If more than ~5% of any given screen is scarlet, the design is misusing the accent.

**The One Accent Rule.** The system has exactly one accent color: scarlet. The chart blues and the portal-color sidebar gradients are exceptions with their own roles (data viz, role identification) and must not bleed into the back-office UI.

**The Cream Paper Rule.** Warm cream (`#F4EFE8` / `#E8DFCF`) is a decorative surface only — never a back-office page background. It belongs on the login aside and the partner landing hero. The back-office stays on white/cool-paper/warm-paper.

## Typography

**Sans (Body, Headings, Labels):** Be Vietnam Pro (100–900 weights), loaded via `next/font/google` as `--font-sans`. Subsets: `vietnamese`, `latin`. The Vietnamese-first family choice is deliberate: Be Vietnam Pro is purpose-built for the full Vietnamese diacritic set, with a humanist warmth that doesn't read as a Latin-grafted face.

**Mono:** Geist Mono, loaded as `--font-geist-mono`. Reserved for times, dates, and numeric codes (e.g. `Thứ 2–6: 08:00 – 22:00` in the operational profile, or the working-hours block). Body and headings never use mono.

**Heading alias:** `--font-heading` resolves to `--font-sans`. There is no separate display face. The system is monotype: the visual hierarchy is carried by size and weight, not by typeface.

**Character:** humanist sans, Vietnamese-first, with a 5:4 cap-to-x-height proportion that reads as quiet rather than technical. The weight 500 ("medium") is the most-used weight for body and labels; weight 600 for headings; weight 400 only for descriptions and helper text.

### Hierarchy

- **Display (Hero)** (semibold 600, clamp(1.875rem, 4vw, 2.25rem), line-height 1.2): page titles, hero copy on the partner landing. Tracking `-0.02em` to `-0.025em`.
- **Headline** (semibold 600, 1.5rem / 24px, line-height 1.3): section headers within a page (e.g. "I. Giờ hoạt động", "II. Không gian cơ sở"). All-caps small-caps treatment (`text-xs font-bold uppercase tracking-wider` in shadcn) is used for sub-section labels (`SUB_LABEL_CLASS`), not for primary headings.
- **Title** (medium 500, 1rem / 16px, line-height 1.4): card titles, field labels, modal titles.
- **Body** (regular 400, 0.875rem / 14px on desktop, 1rem / 16px on mobile, line-height 1.5): the form description, helper text, paragraphs in the partner landing.
- **Label** (medium 500, 0.6875rem / 11px, letter-spacing `0.05em`, uppercase): the `SUB_LABEL_CLASS` idiom — small-caps sub-labels above input fields.
- **Mono Numeric** (Geist Mono 400, 0.75rem / 12px, tabular-nums): times, prices, percentages, working-hours.

### Form Typography Utilities

Three semantic utility classes encode the most-repeated text roles inside forms. They are defined in `globals.css` via Tailwind v4's `@utility` and should be used instead of ad-hoc class strings. Each maps to a documented color token in `colors.*`.

| Utility | Size / Weight | Color token | When to use |
|---|---|---|---|
| `text-sub-label` | 11px / 600 / uppercase / 0.05em | `label-foreground` (oklch 0.439 0 0) | Small-caps sub-section labels above grouped fields (e.g. "Cách tính phí cho khách", "Giá theo giờ chơi"). Replaces `text-[11px] font-semibold text-neutral-600 uppercase tracking-wide`. |
| `text-section-header` | 12px / 700 / uppercase / 0.05em | `section-foreground` (oklch 0.269 0 0) | Roman-numeral section titles ("I. Giờ hoạt động", "II. Không gian cơ sở"). Replaces `text-xs font-bold text-neutral-800 uppercase tracking-wider`. |
| `text-helper` | 12px / 400 / line-height 1.4 | `helper-foreground` (oklch 0.556 0 0) | Helper text under inputs, the inline info note, the description in `AlertDialog`. Replaces `text-xs text-neutral-500 leading-snug`. |
| `text-unit-suffix` | 12px / 400 / line-height 1, `pointer-events: none`, `user-select: none` | `helper-foreground` | Right-aligned suffix inside numeric inputs (đ, phút, %). The `pointer-events: none` keeps the suffix from intercepting clicks while the input remains focusable. |

### Named Rules

**The One Voice Rule.** Be Vietnam Pro is the only typeface. No display face, no alternate serifs, no system-font fallback. The visual hierarchy is carried by size, weight, and case — never by switching the family.

**The Small-Caps for Labels Rule.** Sub-section labels are always rendered in `SUB_LABEL_CLASS` (11px, semibold, uppercase, tracking-wide) — a small-caps idiom that reads as a chapter marker, not a heading. The roman-numeral section headers ("I.", "II.", "III.", "IV.") carry the actual hierarchy.

**The Form-Typography-Utility Rule.** Inside forms, never use `text-neutral-*` Tailwind defaults directly. Use the four utility classes (`text-sub-label`, `text-section-header`, `text-helper`, `text-unit-suffix`) so the gray tonal ramp stays defined by the system tokens (`label-foreground`, `section-foreground`, `helper-foreground`), not by Tailwind's neutral ramp. This keeps the form's gray warmth consistent across the back-office, even if the design system later retunes the dark-mode values.

## Layout

**Spatial grammar:** 4-px base unit. The Tailwind spacing scale (`p-3` = 12px, `p-4` = 16px, `p-6` = 24px, `p-8` = 32px, `p-10` = 40px) is used consistently. Cards pad at 24–40px. Form fields stack at 16–24px (`gap-4` to `gap-6`).

**Grid:** the dashboard layout uses a fixed sidebar (`w-16rem` = 256px) + content area with `md:p-5 lg:p-6` padding. Below 768px the sidebar collapses to a `Sheet`-based mobile drawer (`w-18rem` = 288px). The page content itself uses a single-column flow on mobile, and a 12-column grid for marketing surfaces (partner landing).

**Header:** `h-14` (56px) on mobile, `md:h-16` (64px) on desktop. Contains the sidebar trigger, a vertical separator, and the breadcrumb.

**Sidebar:** 256px expanded, 48px (`w-3rem`) collapsed (icon-only). The active route gets a `bg-primary/8` fill plus a 3px inset left bar (`shadow-[inset_3px_0_0_0_var(--primary)]`). Sub-items indent by 20px (`ms-5`) with a 1px left border.

**Container:** `p-3 pt-4` on mobile, `sm:p-4 sm:pt-6` on small tablets, `md:p-5` on tablets, `lg:p-6` on desktop. The container max-width is implicit (no `max-w-*` set on the dashboard layout; the sidebar takes the `w-16rem` and the rest flows).

**Density:** the operational profile, the partner registration form, and the POS tabs all use a `space-y-4` to `space-y-6` rhythm between sections. Section dividers are 1px hairlines (`border-b border-neutral-100`).

**Responsive changes:**
- Below 768px: sidebar collapses to mobile drawer, single-column forms, the decorative aside on the login form is hidden.
- 768–1024px: sidebar visible, forms still single-column, the decorative aside is visible.
- 1024px+: full layout with content area ≥ 768px wide.

**Touch targets:** form controls default to `h-9` (36px). The submit button is `h-11` (44px) on every page that has one — the 44px is a deliberate iOS-HIG/Android touch-target floor for the most important action.

## Elevation & Depth

The system is **flat with focus rings**. Surfaces do not lift at rest. Depth is signaled by:

1. A 1px hairline border (warm-tinted, `oklch(0.93 0.007 106.5)`).
2. A 1px inset left bar for the active nav item (`shadow-[inset_3px_0_0_0_var(--primary)]`).
3. A focus ring (`ring-3 ring-ring/50`) on the active element.
4. A modal scrim (`bg-black/10 backdrop-blur-xs`) and a 2xl shadow on `AlertDialogContent`.
5. A `shadow-xs` (`0 1px 2px rgba(0,0,0,0.05)`) on Cards — present at all times, a near-imperceptible ambient.

**No big lifted surfaces.** Cards do not float. There is no shadow on hover for the operational-profile or partner-registration form. The page is a stack of paper on a desk, not a stack of cards on a glass shelf.

### Shadow Vocabulary

- **Card ambient** (`box-shadow: 0 1px 2px rgba(0,0,0,0.05)` and the more elaborate `shadow-[0px_1px_3px_rgba(0,0,0,0.05),0px_1px_2px_rgba(0,0,0,0.03)]`): the only shadow on Cards. Sub-threshold at 1× display; visible only when several cards stack.
- **Modal lift** (`box-shadow: 0 8px 24px rgba(0,0,0,0.06)`): the `AlertDialogContent` and the partner-registration image lightbox. The only place a real shadow earns its keep.
- **Active nav inset** (`box-shadow: inset 3px 0 0 0 var(--primary)`): the active sidebar menu item gets a 3px scarlet inset on the left edge. The "depth" comes from the color, not the shadow.
- **Avatar ring** (`ring-2 ring-background`): a 2px ring in the page background color, used to separate stacked avatar images in a group.

### Named Rules

**The Flat-By-Default Rule.** Surfaces are flat at rest. Shadows appear only as a response to state (hover, elevation, focus) or to a deliberate modal context. The form does not lift on hover. The card does not lift on hover.

**The Single-Shadow Rule.** A surface gets one shadow family — not a 1px drop plus a 24px ambient. When a card needs more lift, the modal vocabulary (8px 24px) is used, not a hybrid.

## Shapes

**Corner radius:** the base radius is `0.625rem` (10px) on the design system. Tailwind exposes it as `rounded-md` (8px) and `rounded-lg` (10px). The system uses:
- `rounded-md` (8px) for inputs, buttons, badges, nav items.
- `rounded-lg` (10px) for the underlying Card shape on the form panels.
- `rounded-xl` (14px) for the shadcn `Card` primitive's outer container.
- `rounded-2xl` and `rounded-3xl` for the partner-landing marketing cards (where the visual reads as "tile" rather than "form").
- `rounded-full` for the small badge ("Trực tuyến" status pill, role chips on the login aside).

**Borders:** hairline 1px in `oklch(0.93 0.007 106.5)` is the default. The login-form decorative aside carries a sub-threshold `border-neutral-900/[0.06]` (≈ 1.3:1 contrast) which is intentionally invisible — the cream paper's edge against the white card is the real frame.

**Clipping:** none. No shape masks, no clipped avatars, no image-as-circle pattern outside the `Avatar` component.

## Components

### Buttons
- **Shape:** `rounded-md` (8px). Pill buttons (`rounded-full`) are not used.
- **Primary:** `bg-primary` + `text-primary-foreground`. Hover `bg-primary/80`. Active `translate-y-px`. Disabled `opacity-50`. The shadcn default is **the** brand button.
- **Outline:** `border-border bg-background shadow-xs`. Hover `bg-muted`.
- **Ghost:** transparent background, hover `bg-muted`.
- **Destructive:** `bg-destructive/10 text-destructive`. The destructive variant is a soft tint, not a solid block.
- **Link:** `text-primary underline-offset-4 hover:underline`. Reserved for in-flow links.
- **Touch:** the operational-profile form's submit button uses a **painted-black** idiom (`bg-linear-to-b from-[#2A2A2A] to-[#1A1A1A]` with inset highlight) that is a feature-level exception — the louder, more tactile alternative to the flat `bg-neutral-900` shadcn default. Treat it as a one-off, not a system pattern.

### Cards / Containers
- **Corner Style:** `rounded-xl` (14px) for shadcn `Card`; `rounded-2xl` to `rounded-3xl` for marketing cards.
- **Background:** `bg-card` (white in light mode, `oklch(0.228 0.013 107.4)` in dark).
- **Shadow:** `shadow-xs` (always).
- **Border:** `ring-1 ring-foreground/10` on the shadcn Card primitive.
- **Internal Padding:** `p-6` (24px) on `CardContent` and `CardHeader`; `p-4` (16px) on `data-[size=sm]/card`.

### Inputs / Fields
- **Style:** `h-9` (36px) tall, `rounded-md` (8px), 1px border in `oklch(0.93 0.007 106.5)`, transparent background, `placeholder:text-muted-foreground`.
- **Focus:** `ring-3 ring-ring/50` (12px halo at 50% opacity). The strongest affordance in the system.
- **Error:** `aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20`. The destructive border is the only color signal on the input itself; the error message sits below in `text-destructive`.
- **Disabled:** `disabled:opacity-50 disabled:cursor-not-allowed`.
- **Unit suffix:** the operational profile uses an absolutely-positioned unit label (`phút`, `%`) inside a relatively-positioned wrapper. The padding-right is `pr-10` or `pr-14` to keep the value from running under the suffix.

### Chips / Badges
- **Style:** `rounded-full` (pill), `h-5` (20px) tall, `px-2 py-0.5` (8px / 2px), `text-xs font-medium`.
- **Variants:** default (scarlet), secondary, destructive (soft tint), outline, ghost, link.
- **Usage:** role chips (Admin / Manager / Staff) on the login aside, status badges on partner records, the "Trực tuyến" presence pill.

### Navigation
- **Sidebar (manager, admin, staff):** fixed left, 256px wide, header at the top with the BoardVerse wordmark and portal subtitle, an icon+label list below.
- **Active route:** `bg-primary/8` fill + `font-medium text-primary` + 3px scarlet inset on the left edge.
- **Sub-routes:** 20px indent with a 1px left hairline border.
- **Header:** 56–64px tall, sidebar trigger + vertical separator + breadcrumb.
- **Mobile:** sidebar becomes a `Sheet`-based drawer at 288px wide.

### Modals
- **Shape:** `rounded-xl` (12px) and `p-5` to `p-6` padding.
- **Shadow:** `0 8px 24px rgba(0,0,0,0.06)`.
- **Backdrop:** `bg-black/10 backdrop-blur-xs` (10% black + 4px backdrop blur). Sub-threshold, but it kills the page below and signals "modal."
- **Footer:** primary action on the right, secondary on the left. The single-button "Đóng" pattern in the partner operational profile is a one-off; the system default is two actions for any destructive or irreversible operation.

### Forms
- **Layout:** label-above-input, vertical rhythm of `gap-4` to `gap-6` between fields, `gap-1.5` between label and input.
- **Sub-section label:** `SUB_LABEL_CLASS` — 11px, semibold, uppercase, tracking-wide. Sits above the input.
- **Helper text:** 12px (`text-xs`), `text-muted-foreground` (`oklch(0.58 0.031 107.3)`), `leading-snug`. Sits below the input.
- **Error text:** same size as helper, in `text-destructive` (`oklch(0.577 0.245 27.325)`). Replaces the helper when validation fails.
- **Required state:** not currently used; the form relies on inline labels and helper text rather than asterisks.

### Forms — State-Conditional Submit Row

A form whose submit action depends on the cafe's `operationalStatus` carries a submit row that adapts to three states. The "Reset" / "Đặt lại mặc định" action sits to the left (`variant="ghost"`, full-width on mobile, auto on `sm+`); the primary action sits to the right. Both are `h-11` (44px touch target).

- **Layout:** `flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3` — the primary action is the **last** item on mobile (above the reset), the first item on the right on `sm+`. This is the only place the form violates the "label-above-input" vertical flow; the rationale is thumb reach — the right-side primary is the most-used affordance and should sit closest to the right thumb on mobile.
- **Standard save** (`status ∈ {ACTIVE, INACTIVE, BANNED, SUSPENDED}`): primary button reads "Lưu hồ sơ vận hành" with `type="submit"`. `disabled` when `submitting || (hydrating && !hydrated)`.
- **Activation eligible** (`status = DATA_BLANK && canActivate = true`): primary button reads "Kích hoạt quán" with `type="button"`, leading `Sparkles` icon, and an `onClick` that opens the `ActivateCafeDialog`. The button itself is never `type="submit"` — it is the gateway to the dialog, not a direct submit. `aria-busy` while the mutation is in flight; the dialog opens and locks the form against accidental dismissal.
- **Activation blocked** (`status = DATA_BLANK && canActivate = false`): primary button is `disabled`, with the same "Kích hoạt quán" copy. Below the row, an **inline blocker list** appears (`role="status"`, `aria-live="polite"`): a soft-tinted card (`bg-neutral-50/60 border border-neutral-200 rounded-lg p-3`) with a `SUB_LABEL_CLASS` heading "Cần hoàn tất trước khi kích hoạt" and one row per blocker from the BE's `activationBlockers` array. Each row uses a 1.5pt scarlet dot (`h-1.5 w-1.5 rounded-full bg-primary`) — sub-threshold, the only color on the surface, and `text-destructive` for the row text. The blocker list is the explanation; the disabled button is the consequence.
- **Activation success** (post-`POST /api/manager/cafes/me/activate`): the form re-hydrates with `status = ACTIVE`, the standard-save branch takes over, and a one-line timestamp "Đã kích hoạt lúc HH:mm" appears at the top of the form. The dialog closes; no further interaction is required.
- **Width:** `sm:min-w-[180px]` keeps the primary button from collapsing to a narrow strip when its label shortens to "Đang lưu…". On mobile, the row stretches full-width (`self-stretch`).

### Named Rules

**The Conditional Submit Rule.** A form's primary button never lies. Its label and behavior are driven by server state (`operationalStatus`, `canActivate`), not by what's currently in the local form fields. If the cafe is `DATA_BLANK`, the button is "Kích hoạt quán" — not "Lưu". The submit row is a state-driven affordance, not a free-form "Save" button.

### Avatars
- **Size:** `size-6` (sm), `size-8` (default), `size-10` (lg).
- **Shape:** `rounded-full` always.
- **Ring:** 1px `border-border` (`oklch(0.93 0.007 106.5)`) with `mix-blend-darken` so avatars on busy backgrounds remain readable.
- **Group ring:** 2px `ring-background` to separate stacked avatars.

## Do's and Don'ts

### Do

- **Do** use scarlet (`oklch(0.505 0.213 27.518)`) for primary CTAs, the active nav item, and brand surfaces only. Keep the accent below ~5% of any given screen.
- **Do** carry hierarchy with size and weight, not typeface switches. Be Vietnam Pro at six sizes, three weights, two cases is the entire type system.
- **Do** use the 1px hairline border (`oklch(0.93 0.007 106.5)`) as the default separator. Reach for a heavier line only when the section break needs to read as deliberate.
- **Do** use `h-11` (44px) for the most important button on any page. Use `h-9` (36px) for everything else.
- **Do** use `rounded-md` (8px) for form controls and `rounded-xl` (14px) for cards. Larger radii are reserved for marketing surfaces.
- **Do** keep the form's breathing room generous. `p-6` to `p-8` on cards, `gap-4` to `gap-6` between fields, `gap-1.5` between label and input.
- **Do** use the destructive soft-tint (`bg-destructive/10 text-destructive`) for destructive buttons. Reserve the full destructive fill for inline banners and alert dialogs.
- **Do** write copy in Vietnamese. English is reserved for terms of art (POS, checkout, bracket, settle, signalR).
- **Do** keep validation messages near the input, in Vietnamese, naming the field and the constraint.
- **Do** treat the focus ring (`ring-3 ring-ring/50`) as the strongest affordance in the system. Every interactive control gets one.
- **Do** drive a form's primary button label from server state, not from the local form fields. A cafe in `DATA_BLANK` shows "Kích hoạt quán", not "Lưu". Use the State-Conditional Submit Row pattern (`flex-col-reverse sm:flex-row sm:justify-between gap-3` + `h-11` buttons + optional inline blocker list).

### Don't

- **Don't** use gradient text. Emphasis comes from weight or size, not color.
- **Don't** use glass or blur as a default decoration. The backdrop blur on `AlertDialog` and on `SelectContent` is functional (the scrim and the menu), not decorative.
- **Don't** use a `border-left` or `border-right` above 1px on cards, list items, or callouts. The 3px scarlet inset on the active nav item is the only exception.
- **Don't** reach for hard-offset `box-shadow: 4px 4px 0` neobrutalist shadows. The system is not neobrutalist; one such shadow would look like a costume.
- **Don't** use monospace as a costume for "technical" rather than for code, data, or measurement (times, prices, codes).
- **Don't** use a system display face (Impact, Arial Black) as the display voice. There is no display voice. Be Vietnam Pro is the only voice.
- **Don't** use a Unicode glyph or emoji as a stand-in for an icon. Icons come from `lucide-react` or `@tabler/icons-react`, in a single consistent stroke (1.5 or 1.75).
- **Don't** use the warm cream (`#F4EFE8` / `#E8DFCF`) as a back-office page background. It's a decorative surface for the login aside and the partner landing hero only.
- **Don't** use the portal-color gradients (rose-orange, emerald-teal, violet-indigo) in the back-office UI. They are sidebar logo gradients only.
- **Don't** ship a form that congratulates the user for doing nothing. A successful save is one that changed something.
- **Don't** write a button label that names the channel ("Submit", "Click here"). Name the action ("Lưu hồ sơ vận hành", "Mở phiên chơi", "Bắt đầu ca trực").
- **Don't** show a generic "Save" button when the next action is really a state transition. A "Kích hoạt quán" CTA is a different surface treatment from a "Lưu" — different icon (Sparkles vs. none), different copy, different `type` (button vs. submit). The State-Conditional Submit Row pattern documents the three branches.
