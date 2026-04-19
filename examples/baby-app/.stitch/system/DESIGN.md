# Design System: Bloom — Mobile Pregnancy & Wellness Tracker

## 1. Visual Theme & Atmosphere

A soft, nurturing interface that feels like a gentle morning in a sun-filled nursery. The atmosphere is warm-light — pastel lavender and blush surfaces layered with crisp white cards, punctuated by a coral-pink accent that glows like the first flush of dawn. Spacious enough for emotional calm, detailed enough to track health data meaningfully.

**Density:** 4 — Spacious. Every card breathes. Whitespace is the primary tool for signaling care and calm.
**Variance:** 5 — Moderate. Hero illustrations anchor screens centrally, but stat rows and chart detail panels break into asymmetric layouts.
**Motion:** 6 — Fluid CSS with spring physics. Charts draw in on mount, numbers count up, toggle switches glide. Nothing jarring — motion reinforces gentleness.
**Creativity:** 7 — Illustrated fetal-development scenes, fruit-and-vegetable baby-size comparisons, color-segmented BMI gauges, custom vector avatars.

The visual language is **Pastel Elevation** — soft lavender and blush canvases behind crisp white content cards, separated by diffused lilac-tinted shadows rather than hard borders. Coral-pink threads through as the action color; lilac purple as the data color.

**Target platform:** Mobile only — iOS and Android phones. This design system does not support tablet or desktop layouts. Every decision below assumes a single portrait-held phone in the user's hand.

---

## 2. Color Palette & Roles

### Light Theme (Primary — Default)

- **Lavender Mist** (#EDE8F7) — Primary background canvas. The outermost surface visible behind all cards and content
- **Blush Veil** (#FDEEEE) — Alternate background for pregnancy-mode screens. Used for hero backgrounds and accent sections
- **Cloud White** (#FFFFFF) — Primary card and content surface. Where the user actually interacts with data
- **Soft Ivory** (#FDF9F8) — Tertiary surface for nested cards, input field backgrounds, subtle elevation within a card
- **Ink Charcoal** (#2A2A3A) — Primary text. Deep charcoal for headings, numeric displays, and primary labels. Never pure black
- **Muted Quartz** (#8B8B9C) — Secondary text. Descriptions, timestamps, helper copy, metadata
- **Coral Bloom** (#F28B8B) — Primary accent. CTAs, pregnancy-mode indicators, featured statistics, interactive highlights. Saturation ~65%
- **Coral Whisper** (rgba(242, 139, 139, 0.12)) — Accent tint for soft highlights, active-tab pill backgrounds, chip fills
- **Lilac Pulse** (#8B7ED8) — Secondary accent. Data visualization, toggle active states, chart strokes, insight headings
- **Lilac Whisper** (rgba(139, 126, 216, 0.14)) — Chart fill area, selection highlights, inactive chip emphasis
- **Ghost Divide** (rgba(42, 42, 58, 0.06)) — Structural divider lines between list items and grid cells
- **Chip Mist** (rgba(139, 126, 216, 0.08)) — Chip backgrounds, inactive toggle surfaces, subtle metadata pills
- **Soft Shadow** (rgba(139, 126, 216, 0.12)) — Card elevation shadow. Tinted lilac rather than gray, reinforcing the pastel atmosphere
- **Dim Veil** (rgba(42, 42, 58, 0.24)) — Modal backdrop overlay

### Mode Gradients

Each tracking mode carries a distinct gradient for hero backgrounds and canvas transitions:

- **Pregnancy Mode:** #F7D9DC → #FDEEEE — Blush-into-cream, the default warm tone
- **Wellness Mode:** #D9D3F2 → #EDE8F7 — Lilac-into-mist, for general health tracking
- **Postpartum Mode:** #E8E3F5 → #FDEEEE — Soft transition bridging the two palettes

### BMI Gauge Scale (Semantic Segments)

The BMI gauge is the one place in the system where saturated colors appear side-by-side. Each zone is a discrete semantic signal, not a decorative palette.

- **Underweight Blue** (#5BB4E5) — Below 18.5
- **Healthy Green** (#6DC48A) — 18.5 to 25
- **Caution Yellow** (#F4C84D) — 25 to 30
- **Warning Orange** (#F59052) — 30 to 35
- **Alert Red** (#E85C5C) — Above 35

### Functional Colors

- **Field Green** (#6DC48A) — Success, completed milestones, on-track indicators
- **Fault Red** (#E85C5C) — Errors, destructive actions, medical alerts
- **Caution Amber** (#F4C84D) — Warnings, approaching limits

### Banned Colors

- Pure black (#000000) — never. Use Ink Charcoal (#2A2A3A) as the darkest value
- Pure white on non-card surfaces — white is reserved for card fills
- Neon saturation on anything outside the BMI gauge — coral and lilac stay soft
- Teal, forest green, deep burgundy — these break the pastel atmosphere
- Gradient text on headings — flat Lilac Pulse or Coral Bloom only for accent headings
- Saturated gradients spanning more than one hue family

---

## 3. Typography Rules

### Font Stacks

- **UI & Headlines:** `Plus Jakarta Sans`, system-ui, sans-serif — Friendly rounded geometry with excellent weight range. Used for navigation, headings, buttons, labels, and all UI text
- **Numeric Display:** `Plus Jakarta Sans` at weight 800 — Large statistics (weight, weeks, BMI) render in the same family to maintain visual cohesion; bold weight differentiates them
- **Monospace:** `JetBrains Mono`, monospace — Chart axis labels, measurement units in tabular contexts, date strings

### Type Scale

| Role | Size | Weight | Leading | Tracking | Usage |
|------|------|--------|---------|----------|-------|
| Display | 2rem | 800 | 1.15 | -0.02em | Screen titles ("Pregnancy Health Track", "Smart Weight Insights") |
| Stat | 2.25rem | 800 | 1.1 | -0.015em | Large numeric readouts (weight values, week counts, BMI) |
| Heading | 1.5rem | 700 | 1.25 | -0.015em | Section headers, screen subtitles ("Weight", "BMI") |
| Subheading | 1.125rem | 600 | 1.3 | normal | Card titles, list group headers, mode-selector labels |
| Body | 1rem | 400 | 1.5 | normal | Descriptions, paragraph content |
| Data | 0.875rem | 500 | 1.4 | normal | Unit labels ("Kg", "cm"), metadata, chart annotations |
| Caption | 0.8125rem | 400 | 1.4 | normal | Helper text, date strings, card subtitles |
| Micro | 0.6875rem | 700 | 1.3 | 0.04em | Chart axis labels, status badges (uppercase) |

Sizes are fixed in rem — no `clamp()` scaling required. On very small phones (< 360px width), rely on the root font-size and natural reflow rather than shrinking typography further.

### Numeric Emphasis

Large numeric readouts pair two weights within a single unit:

- **Value:** Plus Jakarta Sans 800, Stat scale, Coral Bloom color (pregnancy mode) or Lilac Pulse (data mode)
- **Unit:** Plus Jakarta Sans 500, Data scale, Muted Quartz color, offset lower via `margin-left: 0.25em`

Example: `50.3 Kg` renders as coral-bold-~2.5rem followed by quartz-medium-0.875rem tucked beside it.

### Banned Fonts

- `Inter` — banned globally. Generic and overused in AI-generated interfaces
- `Poppins`, `Roboto`, `Montserrat` — overused sans defaults, banned for identity reasons
- `Times New Roman`, `Georgia`, `Garamond`, `Palatino` — no generic serifs anywhere
- System default sans-serif alone — always specify Plus Jakarta Sans explicitly

---

## 4. Component Stylings

### Buttons

- **Primary (Coral):** Coral Bloom (#F28B8B) fill, Cloud White text. Border-radius 9999px (fully rounded pill). Used for primary mode actions ("Pregnancy Option", "Log Weight"). On hover: brightness shifts to 105%. On active: `translateY(1px)` for tactile push. Focus: 3px Coral Whisper ring
- **Secondary (Lilac):** Lilac Pulse fill, Cloud White text. Same pill shape. Used for data-oriented CTAs ("View Insights", "See Chart")
- **Ghost:** Transparent fill, 1.5px border in Ghost Divide. Text in Ink Charcoal. Pill-shaped. Used for less prominent actions
- **Destructive:** Fault Red fill, white text. Reserved for deletion with confirmation dialog
- **Disabled:** 40% opacity, no pointer events
- **Icon Buttons:** 44px minimum tap target. Ghost style by default. Lucide icons at 22px in Muted Quartz (inactive) or Coral Bloom / Lilac Pulse (active)

### Cards — Stat Cards

- **Shape:** Border-radius 1.5rem (24px). No visible borders — elevation via shadow and surface contrast
- **Shadow:** `0 4px 20px rgba(139, 126, 216, 0.12)` — soft, diffused, tinted lilac
- **Background:** Cloud White (#FFFFFF) resting on Lavender Mist or Blush Veil canvas
- **Internal padding:** 1.25rem (20px)
- **Layout:** Left-aligned stat with large numeric value and label beneath ("50.3 Kg / Your weight"), or centered illustration with label ("Baby Size" with fruit icon). 2-column grid on mobile home screens
- **Press state:** Shadow softens to `0 2px 12px rgba(139, 126, 216, 0.08)` and card compresses `translateY(1px)` — a gentle "pressed into soft fabric" feel

### Cards — Hero Illustration Card

- **Full-width card** spanning the content area, housing the primary illustration (fetal development scene, mode hero, avatar + greeting)
- **Background:** Cloud White with extra internal padding (2rem)
- **Border-radius:** 2rem (32px) — larger than stat cards to establish visual hierarchy
- **Shadow:** `0 8px 32px rgba(139, 126, 216, 0.14)` — deeper lift signaling importance
- **Illustration:** Centered, occupying ~70% of card width. Custom vector art preferred over photography
- **Caption:** Optional label beneath illustration in Data scale, Muted Quartz

### Mode Selector Pill

- **Shape:** Fully rounded pill (border-radius 9999px)
- **Background:** Coral Whisper (rgba(242, 139, 139, 0.12))
- **Text:** Subheading scale, Coral Bloom color, weight 600
- **Icon:** Chevron-down Lucide icon at 16px, Coral Bloom color
- **Layout:** "Mode: [Current Mode]" format with chevron indicating tap-to-change
- **Tap behavior:** Opens bottom sheet with mode options

### Navigation — Bottom Tab Bar

- **Background:** Cloud White, solid fill. No glass morphism — clean, opaque, grounded
- **Shadow:** `0 -4px 20px rgba(139, 126, 216, 0.08)` — subtle lift rising from below
- **Shape:** Full-width, anchored flush to bottom edge. No floating detachment
- **Items:** Icon (22px Lucide) + label (Micro scale). Active state: Coral Bloom icon + label sitting on a Coral Whisper rounded-rectangle pill. Inactive: Muted Quartz
- **Indicator:** Active tab carries a rounded-rectangle tinted background rather than an underline bar
- **Z-index:** 50 — above all content, below sheets and modals

### Charts — Line Chart

- **Stroke:** Lilac Pulse (#8B7ED8) at 2.5px width, rounded line caps
- **Fill:** Lilac Whisper gradient fading from 30% opacity at the stroke down to 0% at baseline
- **Data points:** 6px circles, Lilac Pulse fill with 2px Cloud White stroke. Active point: 10px with halo ring
- **Gridlines:** Dashed Ghost Divide lines at 1px, both horizontal and vertical
- **Axis labels:** Micro scale in Muted Quartz, Plus Jakarta Sans
- **Current-value indicator:** Vertical line in Lilac Pulse from data point to x-axis, with value label ("50 kg") anchored beside the point
- **Mount animation:** Line draws left-to-right over 800ms via `stroke-dashoffset`; fill area fades in with a 400ms offset

### BMI Gauge

- **Layout:** Horizontal row of 5 pill-shaped segments, equal width, 4px gaps between
- **Segment dimensions:** 18px tall, fully rounded ends
- **Segment colors:** Underweight Blue → Healthy Green → Caution Yellow → Warning Orange → Alert Red, solid fills at full saturation
- **Segment threshold labels:** BMI numbers beneath each segment in Caption scale, Muted Quartz
- **Current-value needle:** Vertical indicator (2px wide, Ink Charcoal) positioned based on current BMI, with the numeric value floating above in Subheading scale
- **No gradient between segments** — discrete zones preserve semantic clarity

### Toggle Switch

- **Track:** 52px wide, 30px tall, fully rounded. Inactive: Chip Mist. Active: Lilac Pulse
- **Thumb:** 26px circle, Cloud White, 2px inset from track edges
- **Transition:** Thumb slides with spring easing, 300ms. Track color crossfades 200ms
- **Thumb shadow:** `0 2px 6px rgba(42, 42, 58, 0.12)` — subtle lift

### Mode / Category Chips

- **Shape:** Fully rounded pill (border-radius 9999px)
- **Background:** Chip Mist (rgba(139, 126, 216, 0.08))
- **Text:** Caption scale in Muted Quartz. Selected state: Lilac Whisper background, Lilac Pulse text, weight 600
- **Padding:** 0.5rem vertical, 1rem horizontal
- **Minimum tap target:** 44px height including padding

### Inputs & Forms

- **Label:** Above input field. Caption scale, Muted Quartz color, weight 500
- **Input field:** Soft Ivory background, 1px Ghost Divide border, 1rem border-radius. Text in Ink Charcoal. Placeholder in Muted Quartz at 70% opacity
- **Focus:** Border transitions to Lilac Pulse. Focus ring: `0 0 0 3px rgba(139, 126, 216, 0.14)`
- **Error:** Border transitions to Fault Red. Error message below in Data scale, Fault Red color
- **No floating labels** — label always visible above

### Loading States

- **Skeleton loaders** matching exact layout dimensions of the content they replace
- **Shimmer animation:** Gradient sweep from left to right, `backgroundPosition` animated from -200% to 200%, 1.5s duration, infinite
- **Skeleton surface:** Chip Mist base with Cloud White shimmer highlight
- **No circular spinners** — banned globally

### Bottom Sheets

- **Background:** Cloud White, solid fill. No glass morphism — maintains the pastel-card atmosphere
- **Drag handle:** 40px wide, 4px tall, centered, Chip Mist color
- **Border-radius:** 1.75rem (28px) on top corners only
- **Shadow:** `0 -8px 32px rgba(139, 126, 216, 0.16)` rising from the sheet's top edge
- **Z-index:** 60 — above nav, below modals
- **Backdrop:** Dim Veil overlay on content behind

### User Avatar

- **Shape:** Circle (`border-radius: 9999px`)
- **Size:** 40px in top-right of greeting header; 64px on profile screens
- **Border:** 2px Cloud White with `0 2px 8px rgba(139, 126, 216, 0.16)` outer shadow
- **Fallback:** User initials in Plus Jakarta Sans 700, Coral Bloom text on Coral Whisper fill
- **No status dots on avatar** — notification indicators live in the app bar

### Pagination Dots

- **Shape:** 8px diameter circles, 6px gap between
- **Inactive:** Chip Mist fill
- **Active:** Coral Bloom fill, slightly wider (pill-shape, 16px wide) to emphasize current position
- **Transition:** Width animates with spring easing, 250ms

---

## 5. Layout Principles

### Grid Architecture

- **CSS Grid preferred** over flexbox percentage math. No `calc()` hacks for column widths
- **Width containment:** Content spans the full viewport width with symmetric horizontal padding. No centered max-width wrappers — the phone screen *is* the canvas
- **Section spacing:** 1.75rem vertical gaps between major sections (greeting → mode pill → hero → CTA → stat grid)
- **Horizontal padding:** 1.25rem left/right on all screens. Applied consistently whether viewport is 360px or 430px wide
- **Top/bottom safe spacing:** Content starts 0.75rem below the status bar safe-area inset and ends 0.75rem above the tab bar

### Screen Hierarchy (Home)

- **Greeting header** at top: user name (Heading scale) + date (Caption scale) left-aligned, avatar right-aligned
- **Mode selector pill** directly beneath greeting, centered
- **Hero illustration card** as the visual anchor
- **Primary CTA button** beneath hero, pill-shaped, centered
- **Pagination dots** indicating multi-page hero content
- **Stat cards grid** at the bottom — 2-column layout showing key metrics

### Detail Screen Structure

- **Back button + screen title** in top bar, left-aligned
- **Primary chart or visualization** immediately below, full-width card
- **Supporting detail card** beneath chart containing editable fields (BMI toggle, height, date)
- **Action row** at the very bottom if applicable

### Content Rows

- **2-column grid** for stat cards — the reference treatment uses equal halves ("Your weight" alongside "Baby Size"). This is the maximum column count anywhere in the app
- **Horizontal scroll rows** for timeline content (weekly milestones, article recommendations). Cards peek partially off-screen on the right to signal scrollability
- **Vertical lists** for chapter-style content with Ghost Divide separators between rows

### Z-Index Stack

| Layer | Z-Index | Usage |
|-------|---------|-------|
| Content | auto | Page content, cards, lists |
| Bottom Nav | 50 | Tab bar |
| Bottom Sheet | 60 | Mode selection, settings, data entry |
| Modal | 70 | Dialogs, confirmations |

### Full-Height Sections

- Always use `min-h-[100dvh]` — never `h-screen`. iOS Safari's dynamic viewport unit prevents the address-bar jump bug
- Respect safe-area insets with `padding-top: env(safe-area-inset-top)` and `padding-bottom: env(safe-area-inset-bottom)` on the root scroll container

---

## 6. Viewport & Device Considerations

The design targets portrait-oriented phones exclusively. Rather than scaling across breakpoints, it adapts across the narrow range of phone sizes while respecting device chrome.

### Target Viewport Range

- **Minimum:** 320px wide (iPhone SE 1st gen, small Androids)
- **Standard:** 375–414px wide (iPhone 12/13/14, Pixel standard)
- **Large:** 414–480px wide (iPhone Pro Max, large Androids, foldable outer screens)
- **Maximum supported:** 480px — beyond this the layout stops scaling

### Layout Adaptation Within Mobile Range

- **No layout reflow across phone sizes** — the same 2-column stat grid, full-width cards, and bottom tab bar apply at every size
- **Natural width expansion:** Cards grow to fill available horizontal space. Padding stays fixed at 1.25rem, so cards gain internal breathing room on larger phones
- **Hero illustration:** Fills ~80% of card width on all phone sizes. Does not scale proportionally beyond that — preserves visual weight balance
- **BMI gauge:** All 5 segments must fit in one row at 320px minimum. Verified by testing at smallest target viewport

### Safe Area Handling

- **Top inset:** Status bar area — apply `padding-top: env(safe-area-inset-top)` on the root scroll container. Never let content hide behind the notch or dynamic island
- **Bottom inset:** Home indicator area (iOS) — tab bar extends behind the home indicator with `padding-bottom: env(safe-area-inset-bottom)` added to its internal padding, so icons/labels sit above the indicator
- **Side insets:** Ignore `env(safe-area-inset-left/right)` in portrait — they're zero. Only relevant if landscape is ever supported

### Orientation

- **Portrait only** — lock to portrait via viewport meta or native orientation flag
- **No landscape layout** — the vertical stack (greeting → hero → CTA → stats) depends on portrait height. Landscape would force horizontal reflow that breaks the hierarchy

### Touch & Gesture

- **Minimum touch target:** 44×44px on all interactive elements, enforced via padding if visual hit area is smaller
- **Gesture zones:** Bottom 20px of screen reserved for native system gestures (swipe-up home, back gesture). Don't place interactive elements in this band
- **Scroll momentum:** `-webkit-overflow-scrolling: touch` on scroll containers (legacy iOS support)
- **Pull-to-refresh:** Supported on home and detail screens. Refresh indicator uses Coral Bloom color

### Platform-Specific Notes

- **iOS:** Use `100dvh` (dynamic viewport height) to handle Safari's collapsing address bar
- **Android:** Test with gesture navigation enabled (no bottom button bar). The tab bar's bottom padding should accommodate both traditional and gesture-nav devices
- **Status bar:** Light content on pastel backgrounds — set status bar style to dark content (dark text/icons on light background)

---

## 7. Motion & Interaction

### Spring Physics

- **Default spring:** `cubic-bezier(0.34, 1.56, 0.64, 1)` — gentle overshoot that settles naturally. Used for card entry, toggle slides, chart point reveals, pagination-dot width shifts
- **Exit easing:** `cubic-bezier(0.25, 0, 0, 1)` — smooth deceleration for elements leaving the viewport
- **No linear easing** — banned globally. Every motion has spring character or ease-out deceleration

### Staggered Reveals

- **Stat cards:** Cascade delay of 80ms between cards. Each enters via `translateY(12px)` → `translateY(0)` with opacity 0 → 1. Spring easing, 450ms duration
- **Chart data points:** Sequential reveal left-to-right after line draws in, 60ms per point
- **BMI gauge segments:** Width animates from 0 to full, 80ms stagger between segments
- **Never mount lists instantly** — the cascading reveal is a signature interaction

### Numeric Count-Up

- **Weight, BMI, and week counts** count up from 0 to target value on first mount, 800ms ease-out. Only on initial page load; subsequent value updates crossfade rather than recount
- **Pregnancy week counter** animates with a spring when the week rolls over, emphasizing the milestone moment

### Perpetual Micro-Interactions

- **Hero illustration:** Gentle breathing animation, 4s cycle — subtle `scale(1.0)` → `scale(1.015)` → `scale(1.0)`, suggesting life
- **Progress rings:** Fill animation on mount, 700ms spring
- **Skeleton shimmer:** Infinite gradient sweep, 1.5s ease-in-out
- **Active tab pill:** Soft pulse on first active state after navigation, single cycle

### Page Transitions

- **Forward navigation:** Content slides up 20px and fades in, 350ms spring
- **Back navigation:** Content fades out, 180ms ease-out
- **Bottom sheet entry:** Slides up from bottom with spring overshoot, 400ms
- **Modal entry:** Scale from 0.95 to 1.0 with opacity fade, 250ms spring

### Performance Rules

- Animate exclusively via `transform` and `opacity` — triggers GPU compositing
- Never animate `top`, `left`, `width`, `height`, `margin`, `padding`
- Chart lines draw via SVG `stroke-dashoffset` animation — compositable
- Use `will-change: transform` sparingly and only on elements actively animating
- Skeleton shimmer uses `backgroundPosition` animation (compositable)

---

## 8. Pastel Elevation Specification

Pastel Elevation is the signature surface treatment for Bloom. Rather than glass morphism or flat design, content sits on tinted pastel canvases with white cards floating above, separated by soft lilac-tinted shadows. The atmosphere is opaque and layered, never translucent.

### Implementation

```
/* Background canvas */
background: #EDE8F7; /* Lavender Mist */

/* Content card */
background: #FFFFFF; /* Cloud White */
border-radius: 1.5rem;
box-shadow: 0 4px 20px rgba(139, 126, 216, 0.12);
```

### Where Pastel Elevation Is Used

- All stat cards and data panels
- Hero illustration containers
- Detail panels beneath charts
- Bottom sheets (sitting above a Dim Veil backdrop)
- Alert toasts and notifications

### Where Pastel Elevation Is NOT Used

- Bottom tab bar — flat with top-edge shadow only, no card separation
- Buttons — solid fills, flat (no resting shadow on primary coral buttons)
- Chart internals — gridlines and axis labels sit directly on the card surface
- Typography — no drop-shadow on text, ever

### Shadow Tiers

Three elevation tiers, each lilac-tinted for atmospheric coherence:

- **Subtle** (hover/press states): `0 2px 8px rgba(139, 126, 216, 0.08)`
- **Standard** (stat cards, data panels): `0 4px 20px rgba(139, 126, 216, 0.12)`
- **Prominent** (hero cards, active modals): `0 8px 32px rgba(139, 126, 216, 0.14)`

### Canvas Transitions

When switching modes (Pregnancy ↔ Wellness), the background canvas crossfades between Blush Veil and Lavender Mist over 400ms with ease-out easing. Cards remain Cloud White throughout — only the canvas beneath shifts.

### Depth Without Borders

Cards never use visible borders. Separation is achieved entirely through:

1. Contrast between card fill (Cloud White) and the canvas (pastel)
2. Soft lilac shadow beneath the card
3. Generous border-radius (1.5rem+) softening the edge

---

## 9. Anti-Patterns (Banned)

### Visual Tells

- No emojis in UI chrome — illustrations are purposeful vector art, not emoji stand-ins
- No `Inter` font — use Plus Jakarta Sans for all UI
- No `Poppins`, `Roboto`, `Montserrat` — overused sans defaults banned
- No generic serifs (Times New Roman, Georgia, Garamond, Palatino) anywhere
- No pure black (#000000) — darkest value is Ink Charcoal (#2A2A3A)
- No pure white on non-card surfaces — white is reserved for card fills
- No neon outer glow shadows on any element
- No oversaturated accent colors outside the BMI gauge (max saturation ~65% for coral and lilac)
- No gradient text on large headings
- No hard black drop-shadows — every shadow carries a lilac tint

### Layout Tells

- No floating glass tab bars detached from edges — the tab bar is flush with bottom, flat, opaque
- No 3-column card grids anywhere — 2-column is the maximum, at every phone size
- No centered heroes that span half the viewport with no content — every hero card carries real illustration plus context
- No overlapping elements or absolute-positioned content stacking (the hero card may float over a tinted background band, but does not overlap other content cards)
- No horizontal scroll on the main axis (except intentional horizontal scroll rows for timeline or article content)
- No glass morphism (`backdrop-filter: blur`) — the atmosphere is opaque pastel cards, not translucent glass

### Mobile-Only Tells

- No sidebar navigation rails — the only navigation pattern is the bottom tab bar
- No desktop-style max-width wrappers centering content in a narrow column — content fills the phone width edge-to-edge (with 1.25rem padding)
- No hover-dependent interactions — every tooltip, dropdown, or reveal must have a tap equivalent. Assume no pointer device exists
- No `:hover` states as the sole indicator of interactivity — use Coral Bloom color, icon contrast, or chip fill to signal tap-ability at rest
- No breakpoint media queries above 480px — the layout does not adapt to tablet or desktop, because those platforms are unsupported
- No landscape-oriented layouts — portrait is the only orientation, locked at the app level
- No mouse-cursor affordances (`cursor: pointer`, custom cursors) — irrelevant on touch
- No right-click menus or keyboard shortcuts as primary interaction paths

### Content Tells

- No generic placeholder names ("John Doe", "Jane Smith") — if a demo name is needed, use first-names that feel like real product users ("Ciel", "Mira", "Nora")
- No fabricated medical statistics or health claims — never invent "reduce pregnancy risk by 40%" or similar numbers. Use `[metric]` placeholders if real data is unavailable
- No fake dashboard metric sections ("HEALTH SCORE", "WELLNESS INDEX", "BY THE NUMBERS")
- No `LABEL // YEAR` formatting convention ("HEALTH // 2025")
- No AI copywriting cliches: "Elevate", "Seamless", "Unleash", "Next-Gen", "Cutting-edge", "Revolutionary", "Empower your journey"
- No medical overreach — this is a tracking app, not a diagnostic tool. Avoid "diagnose", "treat", "cure" language
- No filler UI text: "Scroll to explore", "Swipe down", scroll arrow icons, bouncing chevrons
- No fake round numbers (99.99%, 50%, 10,000+) unless backed by real data

### Technical Tells

- No broken Unsplash image links — use `picsum.photos` or inline SVG illustrations
- No `h-screen` — always `min-h-[100dvh]` for full-height sections
- No `calc()` percentage hacks for grid columns — use CSS Grid with `auto-fill`/`auto-fit` and `minmax()`
- No circular loading spinners — skeleton shimmer loaders only
- No floating label inputs — label always above, error always below
- No SVG animations using `width`/`height` — use `transform: scale` or `stroke-dashoffset` only