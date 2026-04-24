# Spec: Beacon Scanner

**Fidelity source:** `.stitch/references/th_m_beacon_phase_2/code.html` (authoritative — layout, content, and section order derived directly from this file)

---

## Screen Title

Beacon Scanner

---

## Purpose

The Beacon Scanner screen (`/scan`) allows parents to discover and pair nearby BLE beacon devices for their child's safety perimeter. It presents a live radar-style scanning animation while listing discovered beacons with signal strength, technical identifiers (UUID, Major, Minor), and connection actions. The screen is the primary entry point for onboarding new beacons into the BabyGuard monitoring system.

---

## Route

`/scan`

---

## Widget Name

`BeaconScannerScreen`

---

## Design Tokens

**Colors (from DESIGN.md)**

| Token | Hex | Role |
|---|---|---|
| `surfaceBright` | `#F4F2EE` | App background |
| `surfaceContainerLowest` | `#ffffff` | Card fill |
| `surfaceContainerLow` | `#f5f4ee` | Section backgrounds |
| `surfaceContainer` | `#efeee8` | Container fills |
| `surfaceContainerHigh` | `#e8e9e1` | Secondary tonal depth |
| `onBackground` / `onSurface` | `#31332e` | Primary text, primary actions |
| `onSurfaceVariant` | `#5e6059` | Secondary text, icons |
| `tertiary` | `#4f635e` | Trust/safe accent |
| `tertiaryContainer` / `mint` | `#CDE3DC` | Safe-state pill backgrounds |
| `onTertiary` / `onMint` | `#00391C` | Safe-state pill text |
| `outlineVariant` | `#b1b3ab` | Signal strength bars (inactive) |
| Ghost Border | `rgba(177,179,171,0.15)` | Card shadows |

**Typography (from DESIGN.md)**

| Role | Font | Weight | Size | Tracking |
|---|---|---|---|---|
| Display LG | Plus Jakarta Sans | 700 | 3.5rem | -0.02em |
| Headline LG | Plus Jakarta Sans | 700 | 1.75rem | -0.02em |
| Title SM | Plus Jakarta Sans | 600 | 1rem | 0 |
| Body LG | Manrope | 400 | 1rem | 0 |
| Body MD | Manrope | 400 | 0.875rem | 0 |
| Label | Manrope | 500 | — | 0.05em |

**Spacing:** Base unit 1rem (16px). Card padding 1.5rem. Section gap 1.5rem. AppBar height fixed, body padded top to clear AppBar.

**Radius:** `1rem` default, `1.75rem` lg, `2rem` xl, `9999px` full.

---

## Layout Rules

**Scaffold structure:**
- `Scaffold` with `resizeToAvoidBottomInset: true`
- `appBar`: Fixed AppBar, 64px, background `surfaceBright` (`#F4F2EE`), bottom border 1px ghost border
- `body`: `SingleChildScrollView` / `CustomScrollView` with `SliverToBoxAdapter` sections; padding `EdgeInsets.symmetric(horizontal: 24px)`; top padding `pt-24` (~96px) to clear fixed AppBar; bottom padding `pb-36` to clear bottom nav and rescan button
- `bottomNavigationBar`: Fixed `BottomNavBar` (see Sections)

**AppBar contents:**
- Leading: `IconButton` (back arrow, `arrow_back` icon, `onSurface` color, 40×40 tap target)
- Title: `Text` "Quét Beacon", `HeadlineLG` weight 800, `onSurface` color
- Trailing: `CircleAvatar` 40×40 with profile image

**Max width:** `maxWidth: 560px` (max-xl), centered

---

## Sections

### 1. Editorial Header

**Content:** "Thêm Beacon" (Display LG) + subtitle "Đang tìm kiếm các thiết bị bảo vệ gần bạn để bắt độ hành trình an tâm." (Body LG, `onSurfaceVariant`)

**Widget:** `SliverToBoxAdapter` → `Column` with `crossAxisAlignment: CrossAxisAlignment.start`

**Data:** Static copy (no dynamic data)

**Interactive:** None

---

### 2. Radar Scanning Area

**Content:** Concentric circle rings (3 circles, decreasing radius, decreasing opacity) centered on a filled circle with `bluetooth_searching` icon. Text label "ĐANG QUÉT THIẾT BỊ..." below.

**Widget:** `Column` with `mainAxisAlignment: MainAxisAlignment.center`. Rings via `Container` with `BoxDecoration(shape: BoxShape.circle, border: Border.all(...))`. The three circles are absolutely stacked via `Stack` or positioned `Container`s. The central circle is 96×96, `onSurface` fill, `borderRadius: 9999px`, with `bluetooth_searching` icon (filled, 40px, `surface` color on `onSurface` background).

**Data:** Static — this is a scanning-in-progress animation placeholder; real implementation would drive this from a BLE state stream.

**Interactive:** None

---

### 3. Discovered Devices Section

**Content:** Section header "Thiết bị tìm thấy" + a "3 Mới" pill chip (`tertiaryContainer` bg, `tertiary` text). Below: a list of device cards.

**Widget:** `SliverToBoxAdapter` → `Column`. Device cards are `Container` (white, `surfaceContainerLowest`, `borderRadius: 16px`, shadow). Use `ListView.separated` with `shrinkWrap: true` and `physics: NeverScrollableScrollPhysics` to embed within the scroll view.

**Device Card types:**

#### Card Type A — Fully Discovered (primary card)

Layout: `Row` with `MainAxisAlignment.spaceBetween`. Left side: icon (64×64, `surfaceContainer`, rounded-2xl) + text column (device name + sync row with filled `cloud` icon + "Đồng bộ nhóm theo dõi • Đồng bộ" link). Right side: signal strength bars (4 vertical bars, heights 25%/50%/75%/100%, `onSurface` for active, `outlineVariant` for inactive) + RSSI label "-42 RSSI".

Below: `Container` (`surfaceVariant`/30, `borderRadius: 12px`, padding 16px) with 3-column grid showing UUID (truncated, e.g. "...E2C4"), Major (100), Minor (256) — all in mono font.

Primary action: Full-width `ElevatedButton` / `FilledButton` "Kết nối ngay" (`onSurface` bg, `surface` text, `borderRadius: 9999px`, 56px height).

#### Card Type B — Unstable Signal (secondary card)

Layout: `Row` with `MainAxisAlignment.spaceBetween`. Left: 48×48 circle (`surfaceContainerHigh`) + `sensors` icon + text column (device name + "Đang chờ tín hiệu ổn định"). Right: signal bars (2 active, 2 inactive) + RSSI "-78 RSSI".

Action: Outlined button "Kết nối" (`surfaceContainerHigh` bg, `onSurface` text, `borderRadius: 9999px`).

**Data:** `BeaconDevice { id, name, rssi, uuid, major, minor, signalLevel, isStable }`

**Interactive:** Tapping "Kết nối" / "Kết nối ngay" initiates BLE connection pairing flow.

---

### 4. Rescan Button (Fixed)

**Content:** Fixed `ElevatedButton` at `bottom: 112px` (clears bottom nav + some margin), centered horizontally. Icon (`refresh`) + label "Quét lại". Style: `onSurface` bg, `surface` text, `borderRadius: 9999px`, shadow-2xl, 56px height, horizontal padding 48px.

**Widget:** `Positioned` or `Align` within a `Stack` overlaying the scaffold body, or a dedicated FAB-like container.

**Interactive:** `onPressed` triggers BLE rescan.

---

### 5. Bottom Navigation Bar

**Content:** 4 tabs — Trang chủ (home), Thiết bị (devices, active/filled), An toàn (security), Cài đặt (settings). Active tab has `tertiary` color and `FILL: 1` on icon. Profile avatar is shown only in AppBar, not in bottom nav.

**Widget:** `BottomNavigationBar` or custom `NavigationBar` with `fixed` behavior. Background `surfaceContainerLowest` with top border ghost-border. `MediaQuery.of(context).padding.bottom` applied for safe area. Height 80px.

---

## Data

### Entities

**BeaconDevice**
| Field | Type | Notes |
|---|---|---|
| `id` | `String` | Internal ID |
| `name` | `String` | Display name, e.g. "Bé Na" |
| `uuid` | `String` | Full iBeacon UUID |
| `major` | `int` | iBeacon Major value |
| `minor` | `int` | iBeacon Minor value |
| `rssi` | `int` | Signal strength in dBm |
| `signalLevel` | `SignalLevel` | `none` / `weak` / `fair` / `good` / `excellent` |
| `isStable` | `bool` | Whether signal is stable enough to pair |
| `syncStatus` | `SyncStatus` | `synced` / `pending` / `failed` |

### States

- **Scanning** — Radar animation playing, device list empty or updating
- **FoundDevices** — List populated with discovered BeaconDevices
- **Pairing** — Connection in progress (per-device loading state)
- **Error** — BLE unavailable or permission denied

---

## Motion

**Radar rings:** `AnimatedContainer` or `AnimatedOpacity` + `AnimatedScale` loop — three circles scale from 1→2.5 with opacity 0.3→0, duration 2000ms, `ease-out`, infinite repeat with 667ms offset per ring. (CSS: `@keyframes radar { 0% { transform: scale(1); opacity: 0.3; } 100% { transform: scale(2.5); opacity: 0; } }`)

**Device card entry:** `FadeTransition` + `SlideTransition` (offset `Offset(0, 0.1)` → `Offset.zero`), 300ms `ease-out`, staggered 100ms between cards.

**Rescan button press:** `Transform.scale(scale: 0.95)` on `onTapDown`, back to 1.0 on `onTapUp/onTapCancel`, 200ms `ease-out`.

**Pairing button:** Replace label with `CircularProgressIndicator` during connection, then resolve to checkmark or error icon.

---

## Accessibility

- AppBar back button: `semanticsLabel: "Quay lại"` — maps to `arrow_back`
- Rescan button: `semanticsLabel: "Quét lại các thiết bị beacon"`
- Device cards: `Semantics` wrapper with `label: "Beacon: $name, tín hiệu $rssi decibel-mili"`
- "Kết nối ngay" button: `Semantics(label: "Kết nối với beacon $name")`
- Signal strength bars: Hidden from semantics (decorative); RSSI text provides equivalent info
- Color contrast: `onSurface` (`#31332e`) on `surfaceBright` (`#F4F2EE`) — ratio ~12.5:1 ✓; `onSurfaceVariant` (`#5e6059`) on white — ratio ~7:1 ✓; `tertiary` (`#4f635e`) on white — ratio ~5.5:1 (AA large text OK)
- All interactive elements: minimum 48×48px tap target

---

## Anti-Patterns

- Do **not** show raw MAC addresses — use truncated UUID display only
- Do **not** block the main thread during scanning — BLE scanning must be async
- Do **not** auto-connect to unstable (yellow/red signal) beacons without explicit user confirmation
- Do **not** hardcode device names — use names returned from the beacon or allow user to name on pair
- Do **not** use `borderRadius: 0` anywhere — all cards/containers must use the defined radius system
- Do **not** use pure `#000000` for text — always `onSurface` (`#31332e`) from the design system
- Do **not** show the rescan button while actively scanning (prevent double-trigger)
