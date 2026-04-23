# Design System: BabyGuard — Child Safety Beacon App

## 1. Visual Theme & Atmosphere

**Creative North Star: The Silent Guardian**
A warm nursery editorial interface that evokes calm trust through generous whitespace, soft organic surfaces, and muted earth tones. No clinical dashboards. The aesthetic is clinical yet warm — like a well-lit nursery where technology fades into the background and safety takes center stage.

**Atmosphere Spectrum:**
- **Density:** 5 — Daily App Balanced (airy but not sparse, structured but not crowded)
- **Variance:** 6 — Offset Asymmetric (left-aligned heroes, zig-zag card flows, deliberate whitespace imbalances)
- **Motion:** 5 — Fluid CSS (smooth spring physics, gentle fade-ins, subtle pulse for alerts)
- **Creativity:** 7 — Refined Expressive (distinctive typography, signature micro-animations, premium finish)

**Spatial Philosophy:**
- Large vertical voids between status, map, beacon, and CTAs — "open air" not dashboard grid
- 24–40dp intentional breathing room between major sections
- Single focal card at a time feels intentional, not empty
- No edge-to-edge tile stacks; controls sit comfortably within safe area + horizontal padding (20–24dp)

---

## 2. Color Palette & Roles

| Token | Hex | Role |
|-------|-----|------|
| **Canvas Warm** | `#F4F2EE` | Primary app background (beige-gray warm) |
| **Pure Surface** | `#FFFFFF` | Cards, elevated containers, floating elements |
| **Soft Shadow Gray** | `#E7E3DC` | Light borders, dividers, ghost outlines |
| **Primary Text** | `#1E1E1E` | Main text (soft black, never pure `#000000`) |
| **Secondary Text** | `#8E8E8E` | Labels, metadata, helper text |
| **Accent Mint** | `#CDE3DC` | Safe state, positive, monitoring active |
| **Accent Yellow** | `#F3D98C` | Warning, weak signal, attention needed |
| **Accent Lavender** | `#C9D4F5` | Soft secondary accent, co-guardian indicators |
| **Accent Peach** | `#EED9D2` | Alert state, warm emphasis, disconnect |
| **Primary Button** | `#000000` | Primary CTA (high contrast black) |
| **Button Text** | `#FFFFFF` | Text on dark buttons |
| **Tertiary Warm** | `#8B7355` | Optional warm accent for rare highlights |

**Surface Hierarchy (No-Line Rule):**
- Level 0: `Canvas Warm` (`#F4F2EE`) — base background
- Level 1: `Surface Container Low` (`#f5f4ee`) — section backgrounds
- Level 2: `Pure Surface` (`#FFFFFF`) — cards, floating elements

**State Communication:**
- Status communicated by **pill + icon + accent color** — never color alone
- Safe: Mint pill + mint stroke icon
- Weak: Yellow tint pill (30–50% opacity)
- Lost/Countdown: Peach pill, intensity increases with urgency
- Alert: Peach + black CTA, same layout as Home

---

## 3. Typography Rules

**Font Pairing:**
- **Display/Headlines:** Plus Jakarta Sans — characterful, modern, approachable
- **Body/Labels:** Manrope — geometric precision for technical data
- **Mono:** JetBrains Mono — timestamps, UUIDs, technical metadata

**Scale & Hierarchy:**
| Style | Font | Size | Weight | Letter Spacing | Line Height |
|-------|------|------|--------|----------------|-------------|
| Display LG | Plus Jakarta Sans | 3.5rem | 700 | -0.02em | 1.1 |
| Headline LG | Plus Jakarta Sans | 1.75rem | 600 | -0.02em | 1.3 |
| Headline MD | Plus Jakarta Sans | 1.5rem | 600 | 0 | 1.3 |
| Title SM | Plus Jakarta Sans | 1rem | 600 | 0 | 1.4 |
| Body LG | Manrope | 1rem | 400 | 0 | 1.6 |
| Body MD | Manrope | 0.875rem | 400 | 0 | 1.5 |
| Label MD | Manrope | 0.75rem | 500 | 0.05em | 1.4 |
| Label SM | Manrope | 0.6875rem | 500 | 0.04em | 1.3 |

**Rules:**
- Display sizes use tight tracking (-0.02em) for editorial authority
- Body text uses relaxed leading (1.6) for breathability
- Maximum 65 characters per line for body text
- All numbers in high-density contexts use monospace (JetBrains Mono)

**Banned Fonts:**
- Inter (banned for premium/creative contexts)
- Times New Roman, Georgia, Garamond, Palatino (generic serifs banned in dashboards)
- System default fonts

---

## 4. Component Stylings

### Status Pills
- **Design:** Rounded pill shape with icon + text, accent background at 30–50% opacity, text in accent color
- **Safe Pill:** Mint background, mint text, checkmark icon
- **Weak Pill:** Yellow tint background, yellow text, signal bar icon
- **Lost Pill:** Peach background at increasing opacity, peach text
- **Alert Pill:** Peach with black text, pulsing animation

### Status Icon (Super Hero Kid SVG)
- **Safe:** Confident flying pose, 24–40dp, Primary Text stroke
- **Weak:** Softer pose with small cloud accent, subtle warning
- **Lost/Countdown:** Attentive searching pose, alert but not urgent
- **Alert:** Urgent pose with stronger Peach/Yellow accent
- **Animation:** Micro-motion (300–400ms) SVG morph inside icon bounds only, never expanding outside

### Buttons
- **Primary:** `#000000` background, `#FFFFFF` text, `full` radius (9999px), 56px height
- **Secondary:** Ghost style with Ghost Border (Soft Shadow Gray at 15% opacity)
- **Tertiary:** No container, label-md weight, 12px horizontal padding
- **Active State:** Scale to 0.98 with ease-in-out curve, 100ms
- **Never:** Neon outer glow, custom mouse cursors

### Cards
- **Radius:** 20–28dp (generous, soft corners)
- **Shadow:** Ultra-diffused ambient shadow only when elevation serves hierarchy (Blur: 24–32px, Y-Offset: 8px, Color: `#E7E3DC` at 40% opacity)
- **Borders:** Soft Shadow Gray (`#E7E3DC`) for ghost borders when needed
- **High-Density Override:** Replace cards with border-top dividers or negative space
- **Never:** Hard grid layouts, equal-width card stacks

### Input Fields
- **Style:** Minimalist — no bottom line or box outline
- **Background:** `Surface Container Low` (`#efeee8`), 20dp radius
- **Focus:** Pure Surface background with ghost border (10% opacity outline)
- **Label:** Above input, not floating
- **Error:** Below input in Error color (`#9f403d`)

### Map Card
- **Style:** Large corner radius (20–28dp), white surface
- **Content:** GPS pin, accuracy note, timestamp of snapshot
- **Empty State:** Small map icon (32–40dp) + "Chưa có vị trí đã lưu" + helper copy
- **Spacing:** Generous vertical margin above/below; single focal card, not stacked

### Loading States
- **Type:** Skeletal shimmer matching exact layout dimensions
- **Never:** Generic circular spinners
- **Shimmer:** Gradient from Surface Container Low to Surface Container Lowest

### Empty States
- **Style:** Composed illustration with icon + helper text + optional CTA
- **Never:** "No data" text alone

---

## 5. Layout Principles

**Grid System:**
- CSS Grid over Flexbox math — never `calc()` percentage hacks
- Max-width containment: 1400px centered
- Screen horizontal padding: 20–24dp minimum

**Hero Section:**
- **Never:** Centered hero layout (banned when variance exceeds 4)
- **Use:** Split Screen, Left-Aligned, or Asymmetric Whitespace
- **Asymmetric Split:** Large left content block (60%) with right accent zone (40%)

**Card Layouts:**
- **Banned:** "3 equal cards horizontally" feature row
- **Use:** 2-column Zig-Zag, asymmetric grid, or horizontal scroll
- **Rule:** Varying card heights for rhythmic flow

**Full-Height Sections:**
- Use `min-h-[100dvh]` — never `h-screen` (iOS Safari catastrophic jump)

**Vertical Rhythm:**
- Section gaps: `clamp(3rem, 8vw, 6rem)` — scales proportionally
- Between major blocks: 24–40dp
- Between cards: 12–16dp

**Responsive Collapse (< 768px):**
- All multi-column layouts collapse to single column — no exceptions
- Inline typography images stack below headline
- Headline font scales via `clamp()`
- Body text minimum 1rem/14px
- All interactive elements minimum 44px tap target

**Navigation:**
- Bottom nav visible on Home, Safe Zones, Settings
- Hidden on scanner, beacon detail, history, onboarding, invite screens
- Mobile menu: clean slide-in panel with adequate touch targets

---

## 6. Motion & Interaction

**Spring Physics (Default):**
- Stiffness: 100, Damping: 20 — premium, weighty feel
- Never linear easing (`linear` curve is banned)

**Interaction Curves:**
| Interaction | Duration | Curve |
|------------|----------|-------|
| Page transition (push/pop) | 300ms | easeInOut |
| Fade in (content) | 200ms | easeOut |
| Press feedback (scale) | 100ms | easeInOut |
| Bottom sheet | 250ms | easeOutCubic |
| Status change | 300ms | easeInOut |

**Perpetual Micro-Interactions:**
- Alert pulse: 1000ms loop, easeInOut
- Status orb: Floating 8px circle with 12px ambient glow
- Active monitoring: Subtle breathing animation on mint elements

**Staggered Orchestration:**
- Never mount lists instantly
- Cascade delays for waterfall reveals (50ms stagger between items)
- Cards animate in sequence, not all at once

**Performance Rules:**
- Animate exclusively via `transform` and `opacity`
- Never animate `top`, `left`, `width`, `height`
- Grain/noise filters on fixed pseudo-elements only
- Hardware-accelerated transforms only

**Gesture Feedback:**
- Tap: 0.98 scale, 100ms
- Long-press: Subtle haptic + context menu
- Pull-to-refresh: Spring physics on overscroll

---

## 7. Anti-Patterns (Banned AI Tells)

**Explicit Bans:**
- **No emojis anywhere** — they break the premium, calm professional tone
- **No Inter font** — banned for premium/creative contexts
- **No pure black (`#000000`)** — use `#1E1E1E` or `#31332e` soft black
- **No neon/outer glow shadows** — no purple button glows, no neon gradients
- **No AI Purple/Blue Neon aesthetic** — strict banned palette
- **No 3-column equal card layouts** — use asymmetric grids
- **No center-aligned Hero sections** — variance exceeds 4, use asymmetric layouts
- **No generic placeholder names** — "John Doe", "Acme", "Nexus" banned; use "Mẹ", "Bố", "Bà Ngoại"
- **No fabricated data or statistics** — never invent metrics ("99.98% UPTIME SLA", "124ms AVG RESPONSE"); use clear placeholder labels like `[metric]` instead
- **No fake system/metric sections** — "SYSTEM PERFORMANCE METRICS", "BY THE NUMBERS" dashboard cards are banned
- **No `LABEL // YEAR` formatting** — "SYSTEM // 2024" is a lazy AI convention
- **No AI copywriting clichés** — "Elevate", "Seamless", "Unleash", "Next-Gen" are banned
- **No filler UI text** — "Scroll to explore", "Swipe down", scroll arrows, bouncing chevrons banned
- **No broken Unsplash links** — use `picsum.photos` or SVG avatars
- **No 1px solid borders** — use tonal transitions or ghost borders at 10–15% opacity
- **No divider lines between list items** — use vertical white space
- **No dashboard CMS grid** — no 12-column modules filling viewport
- **No floating labels** — labels always above inputs

**Vietnamese Copy Guidelines:**
- User-first names: "Mẹ", "Bố", "Bà Ngoại" — NEVER "phone 1/2"
- Status messages: "Đang an toàn", "Tín hiệu yếu", "Mất kết nối", "Cảnh báo"
- Actions: "Chi tiết beacon", "Mời người cùng theo dõi", "Rời nhóm theo dõi"
- Status chips: "Đang gần beacon", "Xa", "Ngoại tuyến", "Tạm dừng theo dõi"

---

## 8. Accessibility

- Voice announcements for critical alerts
- Haptic feedback for status changes
- Screen reader labels on all interactive elements (`aria-label` on status icon SVG)
- WCAG AA contrast compliance — minimum 4.5:1 for text
- Color-blind safe: status communicated via shape + text + motion, not color alone
- All interactive elements minimum 44px tap target
- Status examples:
  - Safe: "Trạng thái: đang an toàn"
  - Alert: "Trạng thái: cảnh báo — beacon mất kết nối"

---

## 9. Design Tokens Quick Reference

### Colors
```
Canvas Warm:        #F4F2EE
Pure Surface:       #FFFFFF
Soft Shadow Gray:   #E7E3DC
Primary Text:       #1E1E1E
Secondary Text:     #8E8E8E
Accent Mint:        #CDE3DC
Accent Yellow:      #F3D98C
Accent Lavender:    #C9D4F5
Accent Peach:       #EED9D2
Primary Button:     #000000
Button Text:        #FFFFFF
Error:              #9f403d
```

### Spacing (Base 8dp)
```
xs:  4dp   — tight gaps, icon padding
sm:  8dp   — inline spacing
md:  16dp  — standard padding
lg:  24dp  — section gaps
xl:  32dp  — major section separation
xxl: 48dp  — editorial breathing room
```

### Corner Radius
```
sm:   8dp   — small chips, tags
md:  16dp   — cards, inputs
lg:  24dp   — large cards
xl:  32dp   — parent containers
full: 9999dp — pills, FABs
```

### Elevation
```
Level 0: Base surface (no elevation)
Level 1: Cards on surface (use surface_container_low)
Level 2: FAB, bottom sheets (use surface_container_lowest + 4% ambient shadow)
  - Blur: 32px
  - Y-Offset: 8px
  - Color: #31332e at 4% opacity
```
