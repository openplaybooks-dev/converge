# Plan: Analyze Design References



Based on my analysis of all reference files, I will now present the synthesized findings.

---

## Design References Analysis

### Reference Subdirectories Enumerated

| Directory | Type | Purpose |
|-----------|------|---------|
| `serene_guardian` | Design System | "The Serene Sentinel" - High-end editorial design system |
| `lullaby_minimal` | Design System | "Editorial Serenity" - Soft minimalism design system |
| `babyguard_home_phase_2_alert` | Screen Reference | Home screen in alert state |
| `babyguard_home_phase_2_safe_updated` | Screen Reference | Home screen in safe state |
| `babyguard_home_phase_2_weak_signal` | Screen Reference | Home screen in weak signal state |
| `babyguard_onboarding_phase_2` | Screen Reference | Onboarding/permissions screen |
| `ch_p_nh_n_l_i_m_i` (Co-guardians) | Screen Reference | Co-guardian list management |
| `chi_ti_t_beacon_phase_2` (Beacon Detail) | Screen Reference | Beacon detail with monitoring list |
| `co_guardians_list_phase_2` | Screen Reference | Invite/accept beacon guardian screen |
| `history` | Screen Reference | Alert event history |
| `safe_zones` | Screen Reference | Safe zones map and list |
| `settings` | Screen Reference | App settings configuration |
| `th_m_beacon_phase_2` (Add Beacon) | Screen Reference | BLE beacon scanning/registry |

---

## Design System Synthesis

### Color Palette (Merged from Both Design Systems)

**Backgrounds & Surfaces:**
- `surface` / `background`: `#fbf9f5` (warm papery white)
- `surface-container-low`: `#f5f4ee` (warm beige)
- `surface-container`: `#efeee8`
- `surface-container-high`: `#e8e9e1`
- `surface-container-highest`: `#e2e3db`
- `surface-container-lowest`: `#ffffff` (card surface)

**Primary & Text:**
- `primary`: `#5e5e5e` (Serene) / `#5f5e5e` (Lullaby) — off-black charcoal
- `on-surface` / `on-background`: `#31332e` (soft black, NOT pure black)
- `on-primary`: `#faf7f6` / `#f8f8f8`

**Semantic Colors:**
- `secondary` / `tertiary`: `#4f635e` (earthy mint-green for safe states)
- `error`: `#9f403d` (Serene) / `#9e422c` (Lullaby) — muted terracotta red
- `tertiary-container`: `#dff6ee` (mint tint for safe pills)
- `error-container`: `#fe8b70`

**Accent States (BabyGuard app-specific):**
- `mint`: `#D1EEDD` — safe state
- `peach`: `#FFDAD6` — alert/lost state
- `honey`: `#FFECB3` — weak signal state
- `alert-peach`: `#FCEEE9` — alert background tint

### Typography

| Role | Font | Weight |
|------|------|--------|
| Headlines/Display | Plus Jakarta Sans | 700-800 (extrabold), tight letter-spacing (-0.02em) |
| Body/Labels | Manrope | 400-600 |
| Material Symbols | Material Symbols Outlined | 400, FILL variants |

### Border Radius Tokens
- `DEFAULT`: `1rem` (16px)
- `lg`: `2rem` (32px) / `1.75rem` (28px variant)
- `xl`: `3rem` (48px)
- `full`: `9999px` (pill-shaped)

### Elevation & Shadows
- Soft shadow: `0 8px 24px rgba(231, 227, 220, 0.4)` — used across all cards
- No harsh drop shadows; depth achieved via tonal layering

### Design Principles
1. **"No-Line" Rule**: No 1px borders for sectioning; use background color shifts
2. **Tonal Layering**: Cards on backgrounds create natural depth without shadows
3. **Editorial Asymmetry**: Generous vertical staggering (24-40dp), varying card heights
4. **Ghost Border Fallback**: Only if needed, use `outline-variant` at 10-15% opacity

---

## Screen Inventory

| code.html path | Directory Name | Screen Type | Layout Pattern | Key Visual Characteristics |
|---------------|----------------|-------------|---------------|---------------------------|
| `.stitch/references/babyguard_home_phase_2_safe_updated/code.html` | babyguard_home_phase_2_safe_updated | Dashboard/Home | Single-column card stack | Mint safe-state pill, map card, beacon strip, push mute chips |
| `.stitch/references/babyguard_home_phase_2_weak_signal/code.html` | babyguard_home_phase_2_weak_signal | Dashboard/Home | Single-column card stack | Honey/yellow weak signal pill, editorial headline, beacon strip, push mute |
| `.stitch/references/babyguard_home_phase_2_alert/code.html` | babyguard_home_phase_2_alert | Dashboard/Home (Alert) | Single-column card stack | Peach alert pill, "Kiểm tra ngay" headline, pulsing map, primary actions |
| `.stitch/references/babyguard_onboarding_phase_2/code.html` | babyguard_onboarding_phase_2 | Onboarding | Single-column, vertical flow | Permission cards with icons, page indicators, hero illustration |
| `.stitch/references/ch_p_nh_n_l_i_m_i/code.html` | ch_p_nh_n_l_i_m_i | Co-guardians List | List with editorial header | Guardian rows with avatar, status pills, invite button |
| `.stitch/references/chi_ti_t_beacon_phase_2/code.html` | chi_ti_t_beacon_phase_2 | Beacon Detail | Detail + list | Beacon info card, monitoring list with status badges |
| `.stitch/references/co_guardians_list_phase_2/code.html` | co_guardians_list_phase_2 | Invite Accept | Centered modal/card | Accept/reject buttons, permission bullets |
| `.stitch/references/history/code.html` | history | History/Log | Vertical event list | Alert events (peach tint), safe events (mint tint), filter bar |
| `.stitch/references/safe_zones/code.html` | safe_zones | Safe Zones | Map + list bento | Zone cards with toggles, mini-map with pulse overlay, FAB |
| `.stitch/references/settings/code.html` | settings | Settings | Grouped card sections | Toggle switches, segmented controls, profile section |
| `.stitch/references/th_m_beacon_phase_2/code.html` | th_m_beacon_phase_2 | Add Beacon | Scanning UI | Radar animation, found device cards, RSSI bars |

---

## Component Inventory

### Navigation Components
- **TopAppBar**: Fixed header with profile avatar, title, action buttons (back, menu, notifications)
- **BottomNavBar**: 4 tabs (Home, Devices, Security, Settings), filled icon for active tab
- **FAB (Floating Action Button)**: Fixed bottom-right, "Thêm vùng an toàn"

### Content Components
- **Status Pill**: Rounded-full badge with icon + text (Safe: mint, Weak: honey, Alert: peach)
- **Map Card**: Rounded container with image, overlay legend, pulse marker
- **Beacon Strip/Card**: Avatar circle + name + proximity + battery, action chevron
- **Guardian Row**: Avatar initials + name + last update + status pill
- **Safe Zone Card**: Icon + name + address + radius badge + toggle switch

### Input Components
- **Segmented Control**: 3-option pill group (timeout: 2/5/10 min)
- **Toggle Switch**: Rounded pill with sliding knob
- **Push Mute Chips**: Horizontal chip group (5/10/15 min)

### Feedback Components
- **Alert Banner**: Inline status indicator with icon
- **Pulsing Marker**: Map overlay with animated pulse ring
- **Loading Radar**: Concentric circles with center icon

---

## Data Entities

| Entity | Visible Fields | Context |
|--------|---------------|---------|
| **Beacon** | name, UUID, major, minor, RSSI, proximity (gần/xa), battery | Home, Beacon Detail, Add Beacon |
| **User/Guardian** | display name, avatar initials, last update time, status (Đang gần/Xa/Ngoại tuyến/Tạm dừng) | Co-guardians, Beacon Detail |
| **Safe Zone** | name, address, radius, active toggle | Safe Zones screen |
| **Alert Event** | timestamp, duration, beacon name, event type (Left Safe Zone, Connection Lost, Back Home) | History screen |
| **Guardian Invite** | beacon name, owner info, permissions text | Invite Accept screen |

---

## Interaction Patterns

### State Variations Observed:
- **Safe**: Mint pill + `verified_user` icon
- **Weak Signal**: Honey pill + `signal_cellular_0_bar` icon
- **Lost/Countdown**: Peach pill + `error` icon
- **Alert Active**: Peach/ring + pulsing map marker + prominent CTA

### Animation Hints:
- Map pulse: `animate-ping` on error marker
- Status orb: subtle ambient glow
- Card hover: `hover:-translate-y-1` lift
- Button press: `active:scale-95` / `active:scale-[0.98]`

### Touch Targets:
- Minimum 44px touch targets (Apple HIG)
- Full-width buttons in mobile layouts
- Rounded-full buttons for primary CTAs

### Navigation:
- Bottom nav with 4 tabs (Home-centric)
- Back arrow in headers for drill-down
- Modal-style for invite acceptance

---

## Design Scoring Matrix

| Reference | Complexity | Component Count | State Variants | Best Match For |
|-----------|------------|-----------------|----------------|----------------|
| serene_guardian (DESIGN.md) | 4/5 | High | N/A | Overall design language, typography, spacing |
| lullaby_minimal (DESIGN.md) | 4/5 | High | N/A | Editorial feel, tonal layering principles |
| babyguard_home_phase_2_safe | 3/5 | 6 | Safe state | Home screen baseline |
| babyguard_home_phase_2_weak_signal | 3/5 | 6 | Weak state | Home state transitions |
| babyguard_home_phase_2_alert | 4/5 | 7 | Alert/urgent | Alert UI, critical actions |
| babyguard_onboarding_phase_2 | 2/5 | 4 | Permission flow | Onboarding UX |
| ch_p_nh_n_l_i_m_i (Co-guardians) | 3/5 | 5 | List with statuses | Multi-user management |
| chi_ti_t_beacon_phase_2 (Beacon Detail) | 4/5 | 7 | Monitoring list | Detail screens |
| co_guardians_list_phase_2 (Invite) | 2/5 | 4 | Accept/reject | Modal dialogs |
| history | 3/5 | 6 | Filter + events | List-based content |
| safe_zones | 4/5 | 8 | Map + toggles | Settings-style controls |
| settings | 4/5 | 9 | Config sections | Settings screen |
| th_m_beacon_phase_2 (Add Beacon) | 2/5 | 4 | Scanning state | Empty/loading states |

---

### Critical Files for Implementation

1. **`idea.md`** — Core domain specification defining beacons, alert states, multi-user flow, and UI/UX guidelines
2. **`.stitch/references/serene_guardian/DESIGN.md`** — Primary design system with color tokens, typography, and layering principles
3. **`.stitch/references/babyguard_home_phase_2_safe_updated/code.html`** — Baseline home screen implementation reference
4. **`.stitch/references/babyguard_home_phase_2_alert/code.html`** — Alert state home screen for elevated UI patterns
5. **`.stitch/references/settings/code.html`** — Settings configuration patterns and component groupings