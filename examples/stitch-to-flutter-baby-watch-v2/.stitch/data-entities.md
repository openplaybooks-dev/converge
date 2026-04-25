# Data Entities

Derived from `.stitch/references/**/code.html` and `.stitch/screens.json` on 2026-04-25.

## Beacon

**Appears on:** `home-safe`, `home-weak`, `home-alert`, `beacon-detail`, `add-beacon`
**Role:** Domain root — the physical BLE tracker tied to a watched subject (e.g. a child or bag).

**Observed fields:**
- `id: String` — stable identifier (used in routes like `/devices/:id`)
- `name: String` — user-given label ("Linh's backpack")
- `battery: int` — 0–100, shown as battery icon on beacon strip
- `signalStrength: SignalStrength` — enum: `safe` | `weak` | `lost`
- `lastSeenAt: DateTime` — drives "2h ago" / "Just now" relative text
- `rssi: int?` — dBm reading shown as RSSI bars on the add-beacon scanner
- `assignedGuardianIds: List<String>` — co-guardians monitoring this beacon
- `safeZoneId: String?` — current safe zone the beacon is inside, if any

**Evidence:**
- `.stitch/references/babyguard_home_phase_2_safe_updated/code.html` — beacon strip shows name + signal pill + battery icon
- `.stitch/references/chi_ti_t_beacon_phase_2/code.html` — detail card shows id, name, battery, signal, last-seen
- `.stitch/references/th_m_beacon_phase_2/code.html` — scanner shows RSSI bars on found-device cards

## SafeZone

**Appears on:** `safe-zones`
**Role:** Geofence area within which a beacon is considered safe.

**Observed fields:**
- `id: String`
- `name: String` — user label ("Home", "School")
- `center: LatLng` — `{ lat: double, lng: double }`
- `radiusMeters: double` — geofence radius
- `enabled: bool` — bound to the toggle switch on each zone card
- `iconKey: String` — chosen icon shown on zone card and mini-map

**Evidence:**
- `.stitch/references/safe_zones/code.html` — zone cards with name, mini-map pulse overlay, toggle switch, FAB to add

## AlertEvent

**Appears on:** `home-alert`, `history`
**Role:** Append-only log row for safe/alert state transitions and signal events.

**Observed fields:**
- `id: String`
- `beaconId: String` — which beacon the event is about
- `kind: AlertKind` — enum: `alert` | `safe` | `weakSignal` | `reconnected`
- `occurredAt: DateTime` — drives time-relative text in the history list
- `message: String` — human-readable description shown in the row
- `safeZoneId: String?` — zone the beacon left/entered, when relevant
- `acknowledged: bool` — whether a guardian has tapped through the alert

**Evidence:**
- `.stitch/references/history/code.html` — event list with peach (alert) / mint (safe) tinted rows, filter bar
- `.stitch/references/babyguard_home_phase_2_alert/code.html` — alert pill + primary CTAs imply an active AlertEvent

## Guardian

**Appears on:** `co-guardians-list`, `beacon-detail`, `settings`
**Role:** A person (primary user or invited co-guardian) who monitors one or more beacons.

**Observed fields:**
- `id: String`
- `displayName: String`
- `avatarUrl: String?`
- `role: GuardianRole` — enum: `owner` | `coGuardian`
- `status: GuardianStatus` — enum: `connected` | `pending` | `offline` (drives status pills)
- `email: String?` — used for invites
- `phone: String?`

**Evidence:**
- `.stitch/references/ch_p_nh_n_l_i_m_i/code.html` — guardian rows with avatar, status pill, invite button
- `.stitch/references/chi_ti_t_beacon_phase_2/code.html` — monitoring list of co-guardians on beacon detail
- `.stitch/references/settings/code.html` — profile section identifies the owner Guardian

## Invite

**Appears on:** `invite-accept`, `co-guardians-list`
**Role:** Pending request for a Guardian to co-monitor a Beacon; resolved by accept/reject.

**Observed fields:**
- `id: String`
- `beaconId: String` — the beacon being shared
- `inviterGuardianId: String` — who sent the invite
- `inviteeEmail: String` — target recipient (may not yet have an account)
- `permissions: List<String>` — bullets shown in the accept dialog (e.g. "view location", "receive alerts")
- `status: InviteStatus` — enum: `pending` | `accepted` | `rejected` | `expired`
- `createdAt: DateTime`
- `respondedAt: DateTime?`

**Evidence:**
- `.stitch/references/co_guardians_list_phase_2/code.html` — accept/reject modal with permission bullets
- `.stitch/references/ch_p_nh_n_l_i_m_i/code.html` — invite button on the co-guardians list

## AlertConfig

**Appears on:** `settings`
**Role:** Per-user notification and alert-behavior preferences.

**Observed fields:**
- `pushMuted: bool` — bound to push-mute toggle on home screens
- `weakSignalThresholdDbm: int` — segmented control on settings
- `notifyOnReconnect: bool`
- `notifyOnZoneExit: bool`
- `quietHoursStart: String?` — `HH:mm`
- `quietHoursEnd: String?` — `HH:mm`

**Evidence:**
- `.stitch/references/settings/code.html` — grouped cards for Alert / Beacon / Notifications with toggles and segmented controls
- `.stitch/references/babyguard_home_phase_2_safe_updated/code.html` — push-mute control on home

## Relationships

- Guardian 1—* Beacon (an owner Guardian owns many Beacons)
- Guardian *—* Beacon (co-guardians monitor beacons via `Beacon.assignedGuardianIds`)
- Beacon 1—* AlertEvent (a beacon emits many events over time)
- SafeZone 1—* Beacon (a beacon is "in" at most one SafeZone at a time via `Beacon.safeZoneId`)
- Beacon 1—* Invite (invites are scoped to a specific beacon)
- Guardian 1—1 AlertConfig (each guardian has one preferences record)
