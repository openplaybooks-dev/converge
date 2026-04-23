# Beacon Detail Screen Specification

**Fidelity Source:** Linked HTML `.stitch/references/chi_ti_t_beacon_phase_2/code.html` — this spec describes UI matching that file exactly.

---

## 1. Screen Title

Beacon Detail

## 2. Purpose

View beacon configuration details and monitor the list of co-guardians tracking this beacon. Shows beacon identity (name, UUID, Major/Minor), guardian proximity status, and allows inviting new guardians or leaving the monitoring group.

## 3. Route

`/beacon/:id`

## 4. Widget Name

`BeaconDetailScreen`

---

## 5. Design Tokens

| Token | Hex | Usage |
|-------|-----|-------|
| Warm Canvas | `#fbf9f5` | App background |
| Surface Container Low | `#f5f4ee` | Section backgrounds |
| Surface Container Lowest | `#ffffff` | Card fills |
| Surface Container High | `#e8e9e1` | Secondary tonal depth |
| Off-Black Charcoal | `#31332e` | Primary text |
| Muted Stone | `#5e6059` | Secondary text |
| Earthy Mint | `#4f635e` | Safe state, secondary accent, icons |
| Mint Tint | `#D1EEDD` | Safe state pill background |
| Terracotta Alert | `#9f403d` | Error/alert state |
| Peach Tint | `#FFDAD6` | Alert state pill background |
| Honey Tint | `#FFECB3` | Weak signal pill background |

**Typography:**
- Headlines: Plus Jakarta Sans, 700 weight, tracking -0.02em
- Body: Manrope, 400 weight, line-height 1.6
- Labels: Manrope, 500 weight, line-height 1.4

**Spacing (8dp base):** xs=4, sm=8, md=16, lg=24, xl=32, xxl=48

**Border Radius:** lg=2rem (cards), xl=3rem (bottom sheet)

---

## 6. Layout Rules

**Scaffold:**
- TopAppBar: Fixed, translucent with blur backdrop. Back arrow (leading), title "Beacon Detail" (center-left), overflow menu icon (trailing).
- Body: `CustomScrollView` with sections in `SliverList` / `SliverToBoxAdapter`. No bottom nav visible on this screen.
- FAB: Floating "Mời người cùng theo dõi" button, bottom-right, Earthy Mint fill, 56px diameter.

**Section Order (matching HTML exactly):**
1. Hero Section — beacon avatar + name + subtitle
2. Technical Accordion — collapsible UUID/Major/Minor details
3. Monitoring List Card — co-guardian rows with status pills
4. Decorative + Destructive Actions — "Rời nhóm theo dõi" button

**Bottom Nav:** Hidden on this screen (4 tabs visible only on Home, Safe Zones, Settings per UX.md).

---

## 7. Sections

### 7.1 Hero Section

**Content:**
- 80×80dp rounded-xl avatar container with `child_care` Material icon (filled, 48px), Earthy Mint color on Mint Tint background
- Beacon name: "Bé Na" — Display/headline style (3.5rem, 700 weight, tight tracking)
- Subtitle: "Beacon theo dõi của bé" — muted stone, 1rem body

**Widget:** `Row` with `Column` for text, no explicit ListView needed.

**Data:** Beacon name, icon, subtitle from beacon entity.

### 7.2 Technical Accordion

**Content (collapsed state — visible in HTML):**
- Row with `settings_ethernet` icon + "Chi tiết kỹ thuật" label
- `expand_more` chevron icon, rotates on expand
- Taps to reveal: UUID (mono font, bordered), Major/Minor in 2-column grid

**Widget:** `ExpansionTile` or custom `AnimatedContainer` with `ListView` inside when expanded.

**Data:** UUID string, major int, minor int from beacon entity.

### 7.3 Monitoring List Card

**Content:**
- Section header "Người cùng theo dõ" with `group` icon badge
- 3 guardian rows, each with:
  - Avatar circle (initials, colored background, 56px)
  - Name (bold 1rem)
  - Last update time (uppercase label, muted)
  - Status pill (mint/honey/peach tint depending on state)

**Status Pill Variants:**
- `Đang gần beacon` — Mint Tint background, Earthy Mint icon, pulsing dot
- `Xa / không thấy` — Honey Tint background, amber icon
- `Ngoại tuyến` — Surface Container High background, muted stone icon

**Widget:** `ListView` with 3 `GuardianRow` items inside card container. Card has 2rem radius, soft shadow, 32px internal padding.

**Interactive Elements:**
- "Mời người cùng theo dõi" primary button — full-width, rounded-full, Earthy Mint fill, white text
- "Quản lý danh sách" link — text button with chevron

**Data:** Guardian list from UserProvider with proximityStatus enum.

### 7.4 Decorative + Destructive Actions

**Content:**
- Abstract geometric image (opacity 0.1, grayscale, rounded-xl) as decorative backdrop
- "Rời nhóm theo dõi" destructive button — ghost style, error color border, transparent fill

**Widget:** `Stack` with `Positioned` image and centered `OutlinedButton`.

---

## 8. Data Entities

### Beacon
| Field | Type | Notes |
|-------|------|-------|
| id | String | UUID |
| name | String | Display name ("Bé Na") |
| uuid | String | iBeacon UUID |
| major | int | 10001 (example) |
| minor | int | 20002 (example) |
| lastSeen | DateTime | Last detected timestamp |
| isConnected | bool | Connection state |

### Guardian/User
| Field | Type | Notes |
|-------|------|-------|
| id | String | |
| displayName | String | "Mẹ", "Bố", etc. |
| initials | String | First char of name for avatar |
| avatarColor | Color | Background for avatar circle |
| proximityStatus | Enum | near/far/offline |
| lastSeen | String | Human-readable relative time |

---

## 9. Motion

| Interaction | Curve | Duration |
|-------------|-------|----------|
| Page transition (push/pop) | easeInOut | 300ms |
| Accordion expand | easeOutCubic | 250ms |
| Hero fade in | easeOut | 200ms |
| List stagger (3 items) | 50ms delay per item | — |
| Press feedback | scale(0.98) + translateY(-1px) | 100ms |

**Perpetual micro-loop:** Pulsing dot on "Đang gần beacon" status pill — 1000ms loop, opacity 0.6→1.0.

---

## 10. Accessibility

- All interactive elements: minimum 48px touch target
- Status pills: `Semantics` label with full status text ("Safe: near beacon")
- Accordion: `Semantics.expanded` flag for screen readers
- Guardian rows: `Semantics` with name + status
- Back button: proper back gesture support
- Destructive button: `Semantics.button` with alert role

**Contrast notes:**
- Primary text (#31332e) on Warm Canvas (#fbf9f5) — ratio ~15:1 ✓
- Secondary text (#5e6059) on Warm Canvas — ratio ~7:1 ✓
- Mint Tint (#D1EEDD) background — Earthy Mint text (#4f635e) ratio ~4.5:1 (verify WCAG AA for 14px+)
- Error text (#9f403d) on Surface Container Lowest (#ffffff) — ratio ~5:1 ✓

---

## 11. Anti-Patterns

- Do NOT use pure black (#000000) for text
- Do NOT use Inter font
- Do NOT use 3-column equal grids
- Do NOT animate layout properties (top, left, width, height)
- Do NOT use linear easing on interactive elements
- Do NOT add center-focused hero sections on detail screens
- Do NOT use generic placeholder names like "John Doe"
- Do NOT show fake metrics or round percentages
