# BabyGuard UX Specification

## Part 1: Project Overview

**App Name:** BabyGuard
**Description:** Child safety beacon monitoring app that detects when a child is left behind via BLE beacons and triggers comprehensive alerts.
**Platform:** Flutter Mobile (iOS 12+, Android API 21+)

**Core Identity (4 adjectives):** Calm · Protective · Trustworthy · Warm

**User Personas:**
- **Primary:** Parents/Guardians — ensure child safety, receive timely alerts, configure monitoring
- **Secondary:** Extended Family (Phase 2) — co-guardian monitoring, shared alerts

---

## Part 2: Vibe

**Visual Atmosphere:** Warm nursery editorial — evokes calm trust through generous whitespace, soft organic surfaces, and muted earth tones. No clinical dashboards.

**Color Mood:**
- Warm, light background with organic neutrals
- Mint green for safety states, terracotta for alerts
- Tonal layering instead of borders — surfaces feel like paper stacked on paper

**Typography Character:**
- Plus Jakarta Sans — characterful, modern, approachable
- Manrope — geometric precision for technical data
- Generous line heights (1.6) for breathability
- Display sizes with tight letter-spacing (-0.02em) for editorial authority

**Motion Personality:**
- Smooth, gentle — never jarring or clinical
- Soft fade-in transitions for content
- Alert animations use subtle pulse, not aggressive flashing
- Press feedback via gentle scale (0.98), not color shift

---

## Part 3: Screens

### 3.1 Home Screen (`/`)
**Purpose:** Primary dashboard — shows beacon monitoring status, quick actions, co-guardian presence

**Scaffold:**
- AppBar: Large title "BabyGuard", translucent/glass style
- FAB: None (minimal chrome)
- Bottom nav: Visible (Home selected)

**Body:** CustomScrollView with SliverAppBar (collapsing)
- **Header Section:** Current status orb (Safe/Near/Lost/Alert) + display text
- **Beacon Strip:** Horizontal scrollable card showing monitored beacon name, signal strength, "Chi tiết beacon" link
- **Co-Guardian Status:** Subtitle showing who is near beacon ("Còn Mẹ đang gần beacon")
- **Quick Actions:** Row of icon buttons (Scan, Alert Config, Safe Zones)

**Data:**
- BeaconProvider: monitored beacon, RSSI, connection state
- UserProvider: current user, co-guardians with proximity status

**Interactions:**
- Tap beacon strip → Beacon Detail screen (`/beacon/:id`)
- Tap "Chi tiết beacon" → Beacon Detail screen
- Long-press status orb → Test alert countdown (bottom sheet)
- Pull-to-refresh → Re-read beacon state

**Transitions:** Tab switch from nav (in), swipe back (out)

---

### 3.2 Beacon Scanner Screen (`/scan`)
**Purpose:** Discover and pair new BLE beacons

**Scaffold:**
- AppBar: "Quét Beacon" title, back button
- Bottom nav: Hidden
- FAB: None

**Body:** ListView
- **Scanning Indicator:** Pulsing animation with "Đang quét..." text
- **Discovered Beacons List:** RSSI strength indicator, UUID preview, tap to select
- **Empty State:** "Không tìm thấy beacon" with retry button

**Data:**
- BleProvider: discovered beacons, scanning state

**Interactions:**
- Tap discovered beacon → Pairing confirmation bottom sheet
- Swipe down → Cancel scan
- Tap retry → Restart scanning

**Transitions:** Push from Home (slide right)

---

### 3.3 Beacon Detail Screen (`/beacon/:id`)
**Purpose:** View beacon configuration and co-guardian list

**Scaffold:**
- AppBar: Beacon name, back button, overflow menu (Edit, Forget)
- Bottom nav: Hidden
- FAB: "Mời người cùng theo dõi" (Invite)

**Body:** CustomScrollView
- **Beacon Info Card:** Name, UUID, Major/Minor, last seen timestamp
- **Co-Guardian List:** Avatar, name, status chip (Đang gần / Xa / Ngoại tuyến), tap for detail
- **Statistics:** Time monitored today, total connections

**Data:**
- BeaconProvider: selected beacon details
- UserProvider: co-guardian list with proximity status

**Interactions:**
- Tap co-guardian → View their detail
- Long-press co-guardian → Context menu (Remove, Message)
- Tap overflow → Edit beacon name or Forget beacon

**Transitions:** Push from Home or beacon strip

---

### 3.4 Safe Zones Screen (`/safe-zones`)
**Purpose:** Manage locations where alerts are suppressed

**Scaffold:**
- AppBar: "Vùng an toàn" title, back button, Add button
- Bottom nav: Hidden
- FAB: None

**Body:** ListView with section headers
- **Active Zones Section:** Cards with name, address, radius, active toggle
- **Inactive Zones Section:** Muted cards, tap to activate

**Data:**
- SafeZoneProvider: zones list, active states

**Interactions:**
- Tap zone card → Edit Safe Zone screen (`/safe-zones/:id/edit`)
- Tap toggle → Activate/deactivate zone
- Swipe left on zone → Delete confirmation
- Tap Add → Add Safe Zone screen (`/safe-zones/add`)

**Transitions:** Push from Home or Settings

---

### 3.5 Add/Edit Safe Zone Screen (`/safe-zones/add`, `/safe-zones/:id/edit`)
**Purpose:** Create or modify a safe zone

**Scaffold:**
- AppBar: "Thêm vùng an toàn" or "Chỉnh sửa", back button, Save button
- Bottom nav: Hidden

**Body:** Form with scroll
- **Name Field:** Text input, "Tên vùng" label
- **Address Field:** Text input with GPS capture button
- **Radius Selector:** Slider or preset buttons (25m, 50m, 100m, 200m)
- **Map Preview:** Static map showing zone circle
- **Active Toggle:** On/Off switch

**Data:**
- GeolocationProvider: current GPS, address lookup
- SafeZoneProvider: zone being edited

**Interactions:**
- Tap GPS button → Capture current location
- Tap map → Adjust location manually
- Tap Save → Validate and persist

**Transitions:** Push from Safe Zones list

---

### 3.6 History Screen (`/history`)
**Purpose:** View chronological log of disconnection/reconnection events

**Scaffold:**
- AppBar: "Lịch sử" title, back button, filter icon
- Bottom nav: Hidden
- FAB: None

**Body:** ListView with date headers
- **Event Cards:** Timestamp, duration, safe zone context, status icon
- **Filter Bar:** Collapsible date range selector

**Data:**
- EventProvider: history events with timestamps

**Interactions:**
- Tap event → Event Detail bottom sheet
- Tap filter icon → Filter date range bottom sheet
- Pull-to-refresh → Load newer events
- Scroll to bottom → Paginate older events

**Transitions:** Push from Home or Settings

---

### 3.7 Settings Screen (`/settings`)
**Purpose:** Configure alert behavior, timeout, and app preferences

**Scaffold:**
- AppBar: "Cài đặt" title, back button
- Bottom nav: Hidden
- FAB: None

**Body:** ListView with grouped sections
- **Alert Configuration Section:**
  - Timeout picker (2 min / 5 min / custom)
  - Audio toggle
  - Vibration toggle
- **Safe Zones Section:** Link to Safe Zones screen
- **Account & Family Section:** Link to co-guardian management
- **About Section:** App version, privacy policy

**Data:**
- SettingsProvider: alert config, timeout, preferences
- UserProvider: account info

**Interactions:**
- Tap timeout → Timeout picker bottom sheet
- Tap toggle → Immediate state change + persist
- Tap section row → Navigate to detail

**Transitions:** Push from Home nav

---

### 3.8 Alert Screen (`/alert`) — Full Screen Modal
**Purpose:** High-priority alert when child is left behind

**Scaffold:**
- AppBar: None (full screen)
- Bottom nav: None
- FAB: None

**Body:** Center-focused紧急 layout
- **Alert Icon:** Large pulsing warning icon
- **Status Text:** "KHẨN CẤP" + "Không thấy beacon"
- **Countdown Timer:** Seconds remaining
- **Sound/Vibration Indicators:** Active state icons
- **Acknowledge Button:** Large "Tôi đã kiểm tra" button

**Data:**
- AlertProvider: active alert state, countdown, acknowledgment

**Interactions:**
- Tap "Tôi đã kiểm tra" → Dismiss alert + log event
- Shake device → Trigger haptic
- Press power → System alert still fires (background monitoring)

**Transitions:** Present modally (no transition, instant appear)

---

### 3.9 Onboarding Screen (`/onboarding`)
**Purpose:** First-time setup — explain app, pair first beacon, invite family

**Scaffold:**
- AppBar: Progress indicator, skip button
- Bottom nav: Hidden
- FAB: None

**Body:** PageView with horizontal swipe
- **Welcome Page:** App intro, "Theo dõi cùng gia đình" panel
- **Permissions Page:** BLE, notifications, location permissions
- **First Beacon Page:** Quick scan and pair flow
- **Family Page:** Invite co-guardians (Phase 2 placeholder)

**Data:**
- OnboardingProvider: current step, completed state

**Interactions:**
- Swipe pages → Navigate steps
- Tap "Bắt đầu" → Start scanning
- Tap Skip → Go to Home
- Tap "Mời gia đình" → Placeholder (Phase 2)

**Transitions:** Page slide (horizontal)

---

### 3.10 Co-Guardians List Screen (`/guardians`)
**Purpose:** Manage co-guardian family members

**Scaffold:**
- AppBar: "Người cùng theo dõi" title, back button, Add button
- Bottom nav: Hidden

**Body:** ListView
- **Guardian Cards:** Avatar, name, role chip, status, remove button

**Interactions:**
- Tap Add → Show invite options (QR code, link)
- Swipe left → Remove guardian confirmation
- Tap card → Guardian detail

---

### 3.11 Invite Accept Screen (`/invite/:code`)
**Purpose:** Accept invitation to monitor a beacon

**Scaffold:**
- AppBar: "Lời mời theo dõi" title
- Bottom nav: Hidden

**Body:** Centered card
- **Beacon Info:** Name, inviter name, role
- **Trust Note:** Privacy assurance text
- **Action Buttons:** Accept (primary), Reject (ghost)

---

## Part 4: Navigation Architecture

### Navigator Structure
```
ShellRoute (Bottom Nav)
├── Home (`/`)
├── Safe Zones (`/safe-zones`)
└── Settings (`/settings`)

Push Routes (no bottom nav)
├── /scan
├── /beacon/:id
├── /beacon/:id/edit
├── /safe-zones/add
├── /safe-zones/:id/edit
├── /history
├── /guardians
├── /onboarding
└── /invite/:code

Modal Routes
├── Alert Screen (full screen modal, no nav)
├── Bottom Sheets:
│   ├── Pairing Confirmation
│   ├── Timeout Picker
│   ├── Filter Date Range
│   ├── Event Detail
│   ├── Test Alert Countdown
│   └── Confirmations (beacon forget, zone delete, etc.)
```

### Bottom Navigation Tabs
| Index | Route | Icon | Label |
|-------|-------|------|-------|
| 0 | `/` | home_outlined / home_filled | "Trang chủ" |
| 1 | `/safe-zones` | location_outlined | "Vùng an toàn" |
| 2 | `/settings` | settings_outlined | "Cài đặt" |

### Deep Links
| Route | Pattern | Description |
|-------|---------|-------------|
| Home | `babyguard://home` | Main dashboard |
| Alert | `babyguard://alert` | Active alert |
| Scan | `babyguard://scan` | Beacon scanner |
| Invite | `babyguard://invite/{code}` | Accept invitation |

---

## Part 5: Data Context

### Entities

**Beacon**
- `id`: String (UUID)
- `name`: String (friendly name)
- `uuid`: String (iBeacon UUID)
- `major`: int
- `minor`: int
- `txPower`: int (calibrated RSSI at 1m)
- `lastRssi`: int
- `lastSeen`: DateTime
- `isConnected`: bool

**User (Co-Guardian)**
- `id`: String
- `displayName`: String ("Mẹ", "Bố", etc.)
- `avatarUrl`: String?
- `role`: String (owner/guardian)
- `proximityStatus`: Enum (near/far/offline/paused)
- `lastSeen`: DateTime

**SafeZone**
- `id`: String
- `name`: String
- `address`: String
- `latitude`: double
- `longitude`: double
- `radiusMeters`: int (25/50/100/200)
- `isActive`: bool
- `createdAt`: DateTime

**Event (History)**
- `id`: String
- `beaconId`: String
- `type`: Enum (disconnect/reconnect/alert)
- `timestamp`: DateTime
- `durationSeconds`: int?
- `safeZoneId`: String?
- `wasAcknowledged`: bool

**AlertConfig**
- `timeoutSeconds`: int (120/300/custom)
- `audioEnabled`: bool
- `vibrationEnabled`: bool
- `sensitivity`: double (0.0-1.0)

### Relationships
- User has many Beacons (monitoring)
- Beacon has many Users (co-guardians)
- SafeZone is standalone (no relationships)
- Event belongs to Beacon
- AlertConfig is singleton (global settings)

---

## Part 6: Design Tokens

### Color Palette (Material 3 Seed: #4F635E — Earthy Mint)

| Token | Hex | Usage |
|-------|-----|-------|
| Surface | `#fbf9f5` | App background |
| Surface Container Low | `#f5f4ee` | Section backgrounds |
| Surface Container Lowest | `#ffffff` | Cards, elevated surfaces |
| Primary | `#5f5e5e` | Primary buttons, authoritative text |
| On Primary | `#faf7f6` | Text on primary |
| Secondary | `#4f635e` | Safety status, mint accent |
| On Secondary | `#faf7f6` | Text on secondary |
| Tertiary | `#8b7355` | Warm accent (optional) |
| Error | `#9f403d` | Alert, disconnect, danger |
| On Error | `#faf7f6` | Text on error |
| Outline Variant | `#b1b3ab` | Ghost borders (10-15% opacity) |
| On Surface Variant | `#5e6059` | Secondary text |

### Typography (Plus Jakarta Sans + Manrope)

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

### Spacing Rhythm (Base 8dp)

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4dp | Tight gaps, icon padding |
| sm | 8dp | Inline spacing |
| md | 16dp | Standard padding |
| lg | 24dp | Section gaps |
| xl | 32dp | Major section separation |
| xxl | 48dp | Editorial breathing room |

### Corner Radius Scale

| Token | Value | Usage |
|-------|-------|-------|
| sm | 8dp | Small chips, tags |
| md | 16dp | Cards, inputs |
| lg | 24dp | Large cards |
| xl | 32dp | Parent containers |
| full | 9999dp | Pills, FABs |

### Elevation (Tonal — no shadows by default)

| Level | Usage |
|-------|-------|
| 0 | Base surface (no elevation) |
| 1 | Cards on surface (use surface container low) |
| 2 | FAB, bottom sheets (use surface container lowest + 4% ambient shadow) |

**Ambient Shadow (FAB, floating elements):**
- Blur: 32px
- Y-Offset: 8px
- Color: `#31332e` at 4% opacity

### Animation Curves & Durations

| Interaction | Curve | Duration |
|-------------|-------|----------|
| Page transition (push/pop) | Curves.easeInOut | 300ms |
| Fade in (content) | Curves.easeOut | 200ms |
| Press feedback (scale) | Curves.easeInOut | 100ms |
| Bottom sheet | Curves.easeOutCubic | 250ms |
| Alert pulse | Curves.easeInOut | 1000ms (loop) |
| Status change | Curves.easeInOut | 300ms |

---

## Appendix: Status States

| State | Visual | Color | Icon |
|-------|--------|-------|------|
| Safe | Mint background | `#4f635e` | checkmark_circle |
| Near | Yellow tint | `#F3D98C` | signal_cellular_alt_1 |
| Weak | Orange tint | `#EED9D2` | signal_cellular_alt_2_bar |
| Lost | Peach tint | `#EED9D2` | signal_cellular_alt |
| Alert | Red pulse | `#9f403d` | warning_rounded |