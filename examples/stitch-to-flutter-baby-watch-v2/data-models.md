# Data Models

Derived by reading every `.dart` file in `lib/screens/` and `lib/widgets/`, then cross-referencing `.stitch/UX.md` and `.stitch/data-entities.md`. Field types are Dart types (`?` means optional / nullable).

## Entity: Beacon

The physical BLE tracker tied to a watched subject (e.g. a child). Domain root.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | String | yes | Stable identifier (used in routes like `/devices/:id` and `/beacon/:id/followers`) |
| name | String | yes | User-given label ("Bé Na", "Beacon #8210"). Drives hero header and beacon-strip title. |
| subjectKind | BeaconSubjectKind | yes | Drives the avatar icon (child / pet / bag). Inferred from `Icons.child_care` etc. on detail + scanner cards. |
| battery | int | yes | 0–100. Beacon strip shows e.g. "98% Pin". |
| signalStrength | SignalStrength | yes | safe / weak / lost. Drives the home pill, beacon-info card color, and "Xa (Far)" / "Đang ở gần" / "Đang chờ tín hiệu ổn định" labels. |
| rssi | int? | no | dBm reading (e.g. `-42`, `-78`). Shown on add-beacon scanner cards as RSSI bars. |
| lastSeenAt | DateTime | yes | Drives "2 phút trước", "Vừa xong", "5 phút trước", "2 giờ trước" relative text. |
| lastKnownPlace | String? | no | Human-readable last location ("Phòng khách"). Shown on the safe-state map card under "VỊ TRÍ GẦN NHẤT". |
| uuid | String | yes | iBeacon UUID (e.g. `FDA50693-A4E2-4FB1-AFCF-C6EB07647825`). Shown on technical-details card and abbreviated ("...E2C4") on scanner card. |
| major | int | yes | iBeacon major (e.g. `10001`, `100`). |
| minor | int | yes | iBeacon minor (e.g. `20002`, `256`). |
| isPaired | bool | yes | Distinguishes paired beacons (Home/Detail) from scanner-discovered candidates (Add Beacon). |
| isGroupSynced | bool | yes | "Đồng bộ nhóm theo dõi" badge on scanner cards — whether the beacon is synced to a watcher group. |
| ownerGuardianId | String | yes | The Guardian who paired the beacon. Used for "Người sở hữu" inviter chip on invite-accept. |
| assignedGuardianIds | List\<String\> | yes | Co-guardians monitoring this beacon (the followers list). |
| safeZoneId | String? | no | Current safe zone the beacon is inside, if any. |

## Entity: SafeZone

A geofence area within which a beacon is considered safe.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | String | yes | Stable identifier. |
| name | String | yes | "Home", "School", "Grandma's House". |
| iconKey | SafeZoneIcon | yes | home / school / favorite. Maps to `Icons.home`, `Icons.school`, `Icons.favorite` on `SafeZoneCard`. |
| address | String | yes | "123 Calm Valley Street, Serenity District". |
| center | LatLng | yes | `{ lat: double, lng: double }`. Used by mini-map and zone overlay. |
| radiusMeters | double | yes | Geofence radius. |
| radiusLabel | String | yes | Display string ("200m", "500m", "150m") rendered in the radius badge. |
| isActive | bool | yes | Toggle switch on each zone card; active zones suppress alerts. |

## Entity: AlertEvent

Append-only log row for safe / alert / connection events. Drives the History list and informs the active alert state on Home.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | String | yes | Stable identifier. |
| beaconId | String | yes | Which beacon the event is about. |
| childName | String | yes | Subject label snapshotted at event time ("Bé Na") — shown on history card meta row. |
| kind | HistoryEventKind | yes | alert / safe / offline. Drives card tint (peach for alert/offline, mint for safe). |
| title | String | yes | "Left Safe Zone", "Back Home", "Connection Lost". |
| eventLabel | String | yes | Section caption: "Alert Event" / "Safe Event". |
| badgeLabel | String | yes | Status chip text: "Alert", "Safe", "Offline". |
| badgeIcon | IconData | yes | Status chip icon (`warning_rounded`, `verified_user`, `link_off`). |
| statusLabel | String | yes | Pill on the right of the meta row ("Left Safe Zone", "Back Home", "Connection Lost"). |
| occurredAt | DateTime | yes | Event timestamp. |
| timeLabel | String | yes | Display text: "10:24 AM  •  4m duration", "09:15 AM", "Yesterday, 6:30 PM". |
| durationSeconds | int? | no | Present for alert events that resolved (drives "4m duration" suffix). |
| safeZoneId | String? | no | Zone the beacon left/entered, when relevant. |
| acknowledged | bool | yes | Whether a guardian has tapped "Tôi đã kiểm tra". |

## Entity: Guardian

A person (primary user or invited co-guardian) who monitors one or more beacons.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | String | yes | Stable identifier. |
| displayName | String | yes | "Mẹ", "Bố", "Bà Nội", "Elena Fisher". |
| initials | String | yes | Single-letter avatar fallback ("M", "B") used in `FollowerListItem` and `FollowersMonitoringCard`. |
| avatarUrl | String? | no | Profile image. Shown on settings, top-bar avatar, history avatar. |
| role | GuardianRole | yes | owner / coGuardian. Drives the "Người sở hữu" chip on invite. |
| proximity | GuardianProximity | yes | nearBeacon / farOrUnseen / offline. Drives status pill on followers card ("Đang gần beacon" / "Xa / không thấy" / "Ngoại tuyến"). |
| lastSeenAt | DateTime | yes | Drives "Vừa xong", "5 phút trước", "2 giờ trước" labels. |
| email | String? | no | Used for invites. |
| phone | String? | no | |
| planName | String? | no | "Premium Guardian Plan" — only meaningful for the owner; rendered on settings profile. |
| isVerified | bool | yes | Drives the `Icons.verified` badge on the settings avatar stack. |

## Entity: Invite

Pending request for a Guardian to co-monitor a Beacon; resolved by accept/reject.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | String | yes | Stable identifier. |
| beaconId | String | yes | The beacon being shared. |
| beaconName | String | yes | Snapshot ("Bé Na") shown as the headline of the accept card. |
| inviterGuardianId | String | yes | Who sent the invite. |
| inviterDisplayName | String | yes | Snapshot ("Mẹ") rendered as "Mẹ đã mời bạn". |
| inviterRoleLabel | String | yes | Inviter chip text — "Người sở hữu". |
| inviteeEmail | String | yes | Target recipient. |
| permissionPoints | List\<String\> | yes | Bullets shown in the accept card ("Bằng cách chấp nhận, bạn sẽ nhận được thông báo…", "Bạn có thể rời nhóm theo dõi bất kỳ lúc nào"). |
| status | InviteStatus | yes | pending / accepted / rejected / expired. |
| createdAt | DateTime | yes | |
| respondedAt | DateTime? | no | |

## Entity: AlertConfig

Per-user notification + alert-behavior preferences. Backed by the Settings screen.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| guardianId | String | yes | Owner of this config. |
| timeoutInterval | TimeoutInterval | yes | min2 / min5 / min10. Drives the "Timeout Interval" segmented control. min5 is "Recommended". |
| audioAlertEnabled | bool | yes | Audio Alert toggle row. |
| vibrationEnabled | bool | yes | Vibration toggle row. |
| muteDuration | MuteDuration | yes | min5 / min10 / min15. Selected push-mute chip on Home + Settings. |
| muteUntil | DateTime? | no | Active mute window ends at this timestamp; `null` when not muted. |
| rssiThresholdDbm | int | yes | -95 to -45 dBm range. Slider on Settings shows e.g. "-62 dBm". |
| scanIntervalLabel | String | yes | Display label for the scan-interval row ("15 seconds"). |
| scanIntervalSeconds | int | yes | Underlying numeric value. |
| doNotDisturb | bool | yes | Do-Not-Disturb toggle row. |
| notifyOnReconnect | bool | yes | (Mentioned in `.stitch/data-entities.md`; not visible on current Settings screen but reserved for parity.) |
| notifyOnZoneExit | bool | yes | (Mentioned in `.stitch/data-entities.md`; not visible on current Settings screen but reserved for parity.) |
| quietHoursStart | String? | no | `HH:mm`. |
| quietHoursEnd | String? | no | `HH:mm`. |

## Entity: OnboardingPermission

Card content rendered on the onboarding permission list.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| key | PermissionKey | yes | bluetooth / location / notifications / familyShare. |
| icon | IconData | yes | `Icons.bluetooth`, `Icons.location_on`, `Icons.notifications_active`, `Icons.group`. |
| title | String | yes | "Bluetooth", "Vị trí", "Thông báo", "Theo dõi cùng gia đình". |
| body | String | yes | Explanatory copy under the title. |
| footnote | String? | no | Extra fine print (only present on family-share card: "Đồng bộ an toàn với các thành viên khác."). |
| granted | bool | yes | Whether the OS permission has been granted. |

## Entity: Insight

Bento tile shown on Safe Zones (e.g. "24 Alerts", "98% Secure").

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| key | InsightKey | yes | weeklyAlerts / zoneCoverage. |
| title | String | yes | "24 Alerts", "98% Secure". |
| subtitle | String | yes | "This week's entry/exit events", "Optimal zone coverage". |
| icon | IconData | yes | `Icons.notifications_active_outlined`, `Icons.battery_full`. |

## Value Objects

### LatLng
- `lat: double`
- `lng: double`

## Enums

### SignalStrength
- safe — green pill, "verified_user" icon
- weak — honey pill, "signal_cellular_0_bar"
- lost — peach pill, "warning"

### BeaconSubjectKind
- child
- pet
- bag

### SafeZoneIcon
- home
- school
- favorite

### HistoryEventKind
- alert — peach card tint, error accent
- safe — mint card tint, tertiary accent
- offline — peach card tint, "link_off" badge

### GuardianRole
- owner
- coGuardian

### GuardianProximity
- nearBeacon — secondary container pill, "Đang gần beacon"
- farOrUnseen — peach pill, "Xa / không thấy"
- offline — neutral pill, "Ngoại tuyến"

### InviteStatus
- pending
- accepted
- rejected
- expired

### TimeoutInterval
- min2
- min5  *(recommended)*
- min10

### MuteDuration
- min5
- min10
- min15

### PermissionKey
- bluetooth
- location
- notifications
- familyShare

### InsightKey
- weeklyAlerts
- zoneCoverage

## Relationships

- **Guardian 1—\* Beacon** (owner relation via `Beacon.ownerGuardianId`).
- **Guardian \*—\* Beacon** (co-guardian relation via `Beacon.assignedGuardianIds`).
- **Beacon 1—\* AlertEvent** (a beacon emits many events over time via `AlertEvent.beaconId`).
- **SafeZone 1—\* Beacon** (a beacon is in at most one SafeZone at a time via `Beacon.safeZoneId`).
- **Beacon 1—\* Invite** (invites are scoped to a specific beacon; `Invite.beaconId`).
- **Guardian 1—1 AlertConfig** (each guardian has one preferences record via `AlertConfig.guardianId`).
- **AlertEvent \*—1 SafeZone** (optional via `AlertEvent.safeZoneId` for "Left/Back Home" events).

## Mock Data Requirements

- **Guardians**: 4 — one owner ("Mẹ" / "Elena Fisher") with `planName = "Premium Guardian Plan"`, plus "Bố", "Bà Nội", and one extra co-guardian for invitation flows.
- **Beacons**: 3 — one fully paired ("Bé Na", `safe`, battery 98, RSSI -42); two unpaired scanner candidates (one named "Beacon #8210" with RSSI -78, plus one more for "3 Mới" badge parity).
- **SafeZones**: 3 — Home (200m, active), School (500m, active), Grandma's House (150m, inactive). Match the icon keys above.
- **AlertEvents**: 3 minimum to seed the History screen — one `alert` ("Left Safe Zone", with `durationSeconds` ≈ 240), one `safe` ("Back Home"), one `offline` ("Connection Lost", yesterday). Add ~24 more across the past week to make the "24 Alerts" insight tile honest.
- **Invites**: 1 pending invite from owner to a co-guardian for the Bé Na beacon, with two `permissionPoints` matching the accept-card copy.
- **AlertConfig**: 1 record for the owner guardian — defaults `timeoutInterval = min5`, `audioAlertEnabled = true`, `vibrationEnabled = true`, `muteDuration = min5`, `rssiThresholdDbm = -62`, `scanIntervalSeconds = 15`, `doNotDisturb = false`.
- **OnboardingPermissions**: 4 — exactly one entry per `PermissionKey`. Family-share card carries the footnote.
- **Insights**: 2 — `weeklyAlerts` and `zoneCoverage` matching the bento tiles.

## Locale

All user-facing string fields default to **Vietnamese (`vi`)**, matching `.stitch/UX.md`. Mock data should use the Vietnamese strings observed in the screen widgets ("Bé Na", "Mẹ", "Đang gần beacon", "Người sở hữu", etc.). Settings and History screens use English copy in the current widgets ("Premium Guardian Plan", "Left Safe Zone") — preserve as-is.
