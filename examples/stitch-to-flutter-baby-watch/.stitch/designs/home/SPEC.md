# Screen Specification: Home

**Fidelity Source:** `.stitch/references/babyguard_home_phase_2_safe_updated/code.html`

> The described UI matches the linked HTML reference exactly.

---

## 1. Screen Title
**Home**

---

## 2. Purpose
Primary dashboard for the BabyGuard app. Shows real-time beacon monitoring status (child safety state), a map card with last-seen location, beacon proximity strip, and a quick-mute control for suppressing alerts when the guardian is near the child.

---

## 3. Route
`/`

---

## 4. Widget Name
`HomeScreen`

---

## 5. Design Tokens

### Colors (from DESIGN.md)
| Token | Hex | Usage |
|-------|-----|-------|
| Surface | `#fbf9f5` | App background |
| Surface Container Low | `#f5f4ee` | Section backgrounds |
| Surface Container Lowest | `#ffffff` | Cards, elevated surfaces |
| Primary (Earthy Mint) | `#4f635e` | Active tab icon, primary accents |
| On Primary | `#faf7f6` | Text on primary |
| Mint Tint | `#D1EEDD` | Safe state pill background |
| On Mint | `#00391C` | Safe state text |
| Honey Tint | `#FFECB3` | Weak signal state pill background |
| Peach Tint | `#FFDAD6` | Alert state pill background |
| Secondary Text | `#52634F` | Muted labels |
| Off-Black Charcoal | `#31332e` | Primary text |
| Ghost Border | `rgba(177,179,171,0.15)` | Card borders |

### Typography (from DESIGN.md)
| Style | Font | Size | Weight | Tracking |
|-------|------|------|--------|----------|
| Display / Headline LG | Plus Jakarta Sans | 1.75rem–3.5rem | 600–700 | -0.02em |
| Title SM | Plus Jakarta Sans | 1rem | 600 | 0 |
| Body LG | Manrope | 1rem | 400 | 0 |
| Body MD | Manrope | 0.875rem | 400 | 0 |
| Label MD | Manrope | 0.75rem | 500 | 0.05em |
| Label SM | Manrope | 0.6875rem | 500 | 0.04em |

### Spacing (from DESIGN.md)
Base 8dp: xs=4dp, sm=8dp, md=16dp, lg=24dp, xl=32dp, xxl=48dp

### Corner Radius
- Large cards: 2rem (32px)
- Small cards, chips: 1rem (16px)
- Pills, FABs: full (9999dp)

---

## 6. Layout Rules

### Scaffold Structure
- **AppBar:** Fixed top, translucent glass effect (`bg-surface/80 backdrop-blur-md`), 80px height. Left: avatar + "BabyGuard" title. Right: notifications icon button.
- **Body:** Single-column `ListView` with `pt-24 pb-32 px-6 max-w-lg mx-auto` — content padded to avoid fixed header and bottom nav. Sections separated by 32dp gaps.
- **Bottom Nav:** Fixed bottom, 4 tabs (Home, Thiết bị / Devices, An toàn / Safety, Cài đặt / Settings). Glass effect with border-top. Home tab is active.

### No-Line Rule
Section boundaries created via background color shifts. Mint tint pill for status, white cards with ghost border or surface container low for content blocks. No 1px borders.

---

## 7. Sections

### 7.1 Status Section
- **Content:** Centered status pill chip. Three variants: safe (mint), weak (honey), alert (peach). Icon + text ("Đang an toàn", "Tín hiệu yếu", "Mất kết nối").
- **Widget type:** `Column` > `InlineFlex` (pill chip)
- **Data:** `status: SafeState enum (safe|weak|alert)`, `statusLabel: String`
- **Interactive elements:** Long-press → test alert countdown bottom sheet
- **Note:** Status shown is **Safe** in the reference HTML.

### 7.2 Child Info Subheader
- **Content:** Child name ("Bé Na") as large headline + subtitle showing nearest guardian proximity ("Còn Mẹ đang gần beacon").
- **Widget type:** `Column` with `Text` children
- **Data:** `childName: String`, `nearbyGuardianName: String`

### 7.3 Map Card
- **Content:** 288px height rounded card with map image (grayscale + brightness filter). Centered beacon marker with ping pulse animation overlay. Bottom-left overlay card: "Vị trí gần nhất" + "Phòng khách • 2 phút trước" + "near_me" action button.
- **Widget type:** `Stack` > image + positioned overlay card
- **Data:** `mapImageUrl: String`, `lastLocationName: String`, `lastSeenDuration: String`
- **Interactive elements:** "near_me" button → navigation action
- **Motion:** Beacon marker has `AnimationController` looping ping pulse (1s duration, infinite). Press feedback on button.

### 7.4 Beacon Strip
- **Content:** Full-width card showing: sensor icon in mint circle + beacon name ("Bé Na") + proximity/battery line ("Đang ở gần • 98% Pin") + "Chi tiết beacon" text link with chevron.
- **Widget type:** `Card` > `Row` with `Expanded` children
- **Data:** `beaconName: String`, `proximity: String`, `batteryPercent: int`
- **Interactive elements:** Entire strip tappable → Beacon Detail screen (`/beacon/:id`). "Chi tiết beacon" chevron also tappable.

### 7.5 Push Mute Section
- **Content:** White card with title ("Tạm dừng thông báo") + description + 3 pill buttons ("5 phút", "10 phút", "15 phút").
- **Widget type:** `Card` > `Column` > `Row` of `ElevatedButton` (full-width pill)
- **Data:** `muteOptions: List<int>` (5, 10, 15 minutes)
- **Interactive elements:** Tap any pill → set temporary mute duration. Selected pill gets primary fill; others remain ghost.

---

## 8. Data

### Entities Displayed on This Screen
| Entity | Fields |
|--------|--------|
| **Child** | `name` ("Bé Na") |
| **Beacon** | `name`, `lastRssi`, `lastSeen`, `isConnected`, `batteryPercent` |
| **Guardian** (co-guardian) | `displayName` ("Mẹ"), `proximityStatus` |
| **Location** | `lastLocationName` ("Phòng khách"), `lastSeenDuration` ("2 phút trước") |

### Providers
- `BeaconProvider`: monitored beacons, RSSI, connection state, battery
- `UserProvider`: current user, co-guardians with proximity status

---

## 9. Motion

| Element | Animation | Duration | Curve |
|---------|-----------|----------|-------|
| Status orb | Ambient glow pulse (when active) | 1000ms | easeInOut |
| Beacon marker | Infinite ping pulse (concentric rings) | 1000ms loop | easeInOut |
| Map card button | `scale(0.98)` on press | 100ms | easeInOut |
| Mute pills | `scale(0.98)` + -1px translate on press | 100ms | easeInOut |
| Status change | Cross-fade between state pills | 300ms | easeInOut |
| Page entry | Fade in sections with 50ms stagger | 200ms | easeOut |

---

## 10. Accessibility

- **Semantic labels:** Status pill: `_semantics` label "Trạng thái an toàn". Map card: "Bản đồ vị trí cuối cùng của bé". Beacon strip: "Thông tin beacon". Mute buttons: "Tạm dừng thông báo trong X phút".
- **Focus order:** AppBar (1) → Status chip (2) → Child name (3) → Map card (4) → Beacon strip (5) → Mute section (6) → Bottom nav tabs (7–10).
- **Contrast:** Text on mint pill: `#00391C` on `#D1EEDD` — passes WCAG AA for large text. Primary text `#31332e` on `#fbf9f5` — passes AA.

---

## 11. Anti-Patterns

- Do **not** use Inter font.
- Do **not** use pure black (`#000000`) for text or elements.
- Do **not** use 1px borders for section separation — use background color shifts per the No-Line Rule.
- Do **not** animate `top`, `left`, `width`, `height` — use `transform` and `opacity` only.
- Do **not** use centered hero sections — this screen is left-aligned and editorial.
- Do **not** show fake metrics or fabricated data (e.g., "98% accurate"). Battery percentage shown is example/reference only.
- Do **not** use linear easing — spring physics only.
