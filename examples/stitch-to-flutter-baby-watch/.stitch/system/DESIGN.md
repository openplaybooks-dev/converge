# Design System: BabyGuard

## 1. Visual Theme & Atmosphere

**A restrained, warm nursery editorial** — a child-safety app that feels like a trusted caregiver, not a surveillance dashboard. Generous whitespace with soft organic surfaces. Muted earth tones that evoke calm confidence. Tonal layering replaces borders. Typography with editorial authority — tight tracking on headlines, relaxed leading on body. Motion is gentle and springy, never clinical. The atmosphere is "calm nursery at golden hour" — protective without being cold, authoritative without being sterile.

**Density:** Daily App Balanced (5/10) — enough information density for monitoring, never cockpit-tight.
**Variance:** Offset Asymmetric (6/10) — editorial staggering, varying card heights, no forced symmetry.
**Motion:** Fluid CSS (6/10) — spring physics, gentle fade-ins, perpetual micro-loops on active states.

---

## 2. Color Palette & Roles

All values are hex codes. No purple, no neon, no saturated glow. Maximum 1 accent color (saturation below 80%).

| Descriptive Name | Hex | Functional Role |
|---|---|---|
| **Warm Canvas** | `#fbf9f5` | Primary app background — warm papery white |
| **Pure Surface** | `#ffffff` | Card and container fill — highest elevation |
| **Surface Container Low** | `#f5f4ee` | Section backgrounds — tonal depth step 1 |
| **Surface Container** | `#efeee8` | Deeper tonal layering |
| **Surface Container High** | `#e8e9e1` | Secondary tonal depth |
| **Off-Black Charcoal** | `#31332e` | Primary text — NOT pure black |
| **Muted Stone** | `#5e6059` | Secondary text, descriptions |
| **Ghost Border** | `rgba(177,179,171,0.15)` | Ghost borders at 10–15% opacity (fallback only) |
| **Earthy Mint** | `#4f635e` | Safe state, secondary accent, trust |
| **Mint Tint** | `#D1EEDD` | Safe state pill background |
| **Terracotta Alert** | `#9f403d` | Error/alert state — muted, not aggressive |
| **Peach Tint** | `#FFDAD6` | Alert state pill background |
| **Honey Tint** | `#FFECB3` | Weak signal state pill background |
| **Alert Background** | `#FCEEE9` | Alert state surface tint |

**Light Theme (default):** Values above.
**Dark Theme:** Surface backgrounds shift to `#1a1a18`, cards to `#242422`, text to `#e8e9e1`. Mint and Peach/Honey tints desaturated by ~20%. Terracotta alert remains `#c45a56`.

---

## 3. Typography Rules

**Display / Headlines:** Plus Jakarta Sans — 700–800 weight, letter-spacing: -0.02em. Editorial authority through tight tracking, not screaming size. Hierarchy via weight and color, not scale alone.

**Body / Labels:** Manrope — 400–600 weight, line-height 1.6 for body, 1.4 for labels. Relaxed breathing room. Letter-spacing: 0 for body, 0.05em for labels.

**Chrome / UI:** Manrope 500 — navigation labels, button text, status chips.

**BANNED FONTS:**
- Inter — strictly forbidden in any context
- Generic system fonts for premium/creative contexts
- Serif fonts in dashboards or software UIs (Times New Roman, Georgia, Garamond, Palatino)

**Typography Scale:**
| Role | Font | Weight | Size | Leading | Tracking |
|---|---|---|---|---|---|
| Display LG | Plus Jakarta Sans | 700 | 3.5rem | 1.1 | -0.02em |
| Headline LG | Plus Jakarta Sans | 600 | 1.75rem | 1.3 | -0.02em |
| Headline MD | Plus Jakarta Sans | 600 | 1.5rem | 1.3 | 0 |
| Title SM | Plus Jakarta Sans | 600 | 1rem | 1.4 | 0 |
| Body LG | Manrope | 400 | 1rem | 1.6 | 0 |
| Body MD | Manrope | 400 | 0.875rem | 1.5 | 0 |
| Label MD | Manrope | 500 | 0.75rem | 1.4 | 0.05em |
| Label SM | Manrope | 500 | 0.6875rem | 1.3 | 0.04em |

---

## 4. Component Stylings

### Status Pills
Rounded-full pill shape. Icon + text, never icon-only. Three variants:
- **Safe:** Mint tint background (`#D1EEDD`), earthy mint icon, "check_circle" icon
- **Weak Signal:** Honey tint background (`#FFECB3`), amber icon, "signal_cellular_0_bar" icon
- **Alert:** Peach tint background (`#FFDAD6`), terracotta icon, "error" icon

### Cards
Generous corner radius: `2rem` (32px) for large cards, `1rem` (16px) for small cards. No hard borders — depth achieved via tonal layering (surface container low on warm canvas). Soft diffused shadow: `0 8px 24px rgba(231, 227, 220, 0.4)` when elevation needed. On active/press: subtle -1px translate with spring physics.

### Buttons
- **Primary:** Earthy Mint fill (`#4f635e`), white text, rounded-full, 48px minimum height. Active: scale(0.98) + -1px translate.
- **Secondary/Ghost:** No fill, ghost border at 15% opacity, charcoal text. Same press feedback.
- **Destructive:** Terracotta fill for destructive actions.

### Bottom Sheets
Slide up with `easeOutCubic` curve, 250ms duration. Rounded top corners: `3rem` radius. Drag handle: centered 32px × 4px pill, ghost border. No harsh drop shadow — tonal border top.

### Map Cards
Rounded container (`2rem` radius) with image. Overlay legend in bottom-left. Pulsing marker for active alerts: concentric ring animation, 1000ms loop, terracotta tint.

### FAB (Floating Action Button)
Surface container lowest fill with ambient shadow (`0 8px 32px rgba(49,51,46,0.08)`). Rounded-full. Earthy mint icon. 56px diameter. Fixed bottom-right with 24px margin.

### Navigation Bar (Bottom)
4 tabs: Home, Safe Zones, Settings. Active tab: filled icon + earthy mint color. Inactive: outlined icon + muted stone. No elevation — tonal surface container background.

### Segmented Controls
3-option pill group. No borders — selected state via solid fill (earthy mint), unselected via transparent with ghost border on press.

### Toggle Switches
Rounded pill track with sliding knob. Active: earthy mint. Inactive: ghost border.

### Beacon Strip
Horizontal scrollable card. Avatar circle (initials) + beacon name + proximity text + battery indicator + chevron. Full-width touch target (minimum 48px height).

### Guardian Row
Avatar circle (initials) + name + last update time + status pill. Swipe-to-remove gesture on list.

---

## 5. Layout Principles

**Mobile-First:** All layouts collapse to single-column below 768px. No horizontal overflow.

**Spacing Rhythm (Base 8dp):**
- `xs`: 4dp — tight gaps, icon padding
- `sm`: 8dp — inline spacing
- `md`: 16dp — standard padding, card internal padding
- `lg`: 24dp — section gaps
- `xl`: 32dp — major section separation
- `xxl`: 48dp — editorial breathing room, headline margin-bottom

**No-Line Rule:** Section boundaries created via background color shifts, not 1px borders. Only use ghost borders (10–15% opacity) as a fallback for tactile separation.

**Editorial Asymmetry:** Vertical staggering of 24–40dp between content blocks. Cards vary in height — not uniform grids.

**BANNED LAYOUTS:**
- 3-column equal card grids
- Centered hero sections
- Flexbox percentage math
- `h-screen` for full-height sections (use `min-h-[100dvh]`)

---

## 6. Motion & Interaction

**Spring Physics Default:** stiffness: 100, damping: 20 — premium, weighty feel.

| Interaction | Curve | Duration |
|---|---|---|
| Page transition (push/pop) | easeInOut | 300ms |
| Fade in (content) | easeOut | 200ms |
| Press feedback (scale) | easeInOut | 100ms |
| Bottom sheet | easeOutCubic | 250ms |
| Alert pulse | easeInOut | 1000ms (loop) |
| Status change | easeInOut | 300ms |

**Perpetual Micro-Interactions:**
- Alert map marker: infinite ping pulse at 1000ms
- Status orb: subtle ambient glow animation on active states
- Scanning radar: concentric circle expansion loop

**Staggered Orchestration:** List items cascade in with 50ms delay per item. Never mount lists instantly.

**Press Feedback:** `scale(0.98)` + `-1px translateY` on all interactive elements. No color-shift feedback.

**Performance Rule:** Animate exclusively via `transform` and `opacity`. Never animate `top`, `left`, `width`, `height`.

---

## 7. Anti-Patterns (Banned)

This design system is **explicitly anti-generic**. The following patterns are permanently forbidden:

**Typography:**
- Inter font — never use, for any purpose
- Pure black (`#000000`) — use Off-Black Charcoal `#31332e`
- Generic serif fonts
- AI copywriting clichés: "Elevate", "Seamless", "Unleash", "Next-Gen"
- Filler text: "Scroll to explore", "Swipe down", bouncing chevrons
- `LABEL // YEAR` formatting ("SYSTEM // 2024")

**Visual:**
- Emojis anywhere in the UI
- Purple/blue neon glows or gradients
- Pure black elements
- Oversaturated accents (saturation > 80%)
- Neon outer glow shadows
- Custom mouse cursors

**Layout:**
- 3-column equal card grids
- Centered hero sections
- Overlapping elements — every element occupies its own clear spatial zone
- Horizontal scroll on mobile
- Absolute-positioned content stacking

**Data:**
- Fake round numbers (`99.99%`, `50%`)
- Fabricated metrics or statistics — never generate performance numbers, uptime percentages, or response times. Use placeholder labels like `[metric]` if real data is not available.
- Generic placeholder names ("John Doe", "Acme", "Nexus")
- "SYSTEM PERFORMANCE METRICS", "BY THE NUMBERS" dashboard cards with invented data

**Images:**
- Broken Unsplash links — use `picsum.photos` or SVG avatars
- Images overlapping text — clean spatial separation always

**Motion:**
- Linear easing on interactive elements (spring physics only)
- Animating layout properties (`top`, `left`, `width`, `height`)

---

*Generated for BabyGuard — child safety beacon monitoring app. Core identity: Calm · Protective · Trustworthy · Warm.*
