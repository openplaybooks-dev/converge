# Data Models — BabyWatch (BabyGuard)

## Entity: Beacon
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | String | yes | Unique identifier (UUID) |
| name | String | yes | Friendly name (e.g., "Bé Na") |
| uuid | String | yes | iBeacon UUID |
| major | int | yes | iBeacon Major value |
| minor | int | yes | iBeacon Minor value |
| txPower | int | yes | Calibrated RSSI at 1 meter |
| lastRssi | int | yes | Most recent signal strength |
| lastSeen | DateTime | yes | Last connection timestamp |
| isConnected | bool | yes | Connection state |
| batteryPercent | int? | no | Beacon battery level (e.g., 98%) |

## Entity: User (Co-Guardian)
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | String | yes | Unique identifier |
| displayName | String | yes | Display name (e.g., "Mẹ", "Bố") |
| avatarUrl | String? | no | Profile image URL |
| role | GuardianRole | yes | owner / guardian |
| proximityStatus | ProximityStatus | yes | near / far / offline / paused |
| lastSeen | DateTime | yes | Last activity timestamp |
| isOnline | bool | yes | Currently connected |

## Entity: SafeZone
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | String | yes | Unique identifier |
| name | String | yes | Zone name (e.g., "Home", "School") |
| address | String | yes | Street address |
| latitude | double | yes | Center coordinate |
| longitude | double | yes | Center coordinate |
| radiusMeters | int | yes | Zone radius (25/50/100/200) |
| isActive | bool | yes | Active state |
| icon | IconData | yes | Zone icon |
| createdAt | DateTime | yes | Creation timestamp |

## Entity: Event (History)
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | String | yes | Unique identifier |
| beaconId | String | yes | Parent beacon ID |
| childName | String | yes | Name of child associated |
| type | EventType | yes | disconnect / reconnect / alert / safe |
| timestamp | DateTime | yes | Event occurrence |
| durationSeconds | int? | no | Duration of event |
| safeZoneId | String? | no | Context zone if applicable |
| wasAcknowledged | bool | yes | User acknowledged |
| category | String | yes | Event category (e.g., "Alert Event", "Safe Event") |
| title | String | yes | Event title |
| icon | IconData | yes | Event icon |
| iconFilled | bool | yes | Filled icon variant |
| badgeLabel | String | yes | Status badge text |
| badgeColor | Color | yes | Badge background color |
| backgroundColor | Color | yes | Card background color |
| iconColor | Color | yes | Icon color |
| eventLabel | String | yes | Event description |
| eventLabelColor | Color | yes | Event label color |
| time | String | yes | Formatted time string |

## Entity: AlertConfig
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| timeoutSeconds | int | yes | Alert timeout (120/300/600 seconds) |
| audioEnabled | bool | yes | Audio alert toggle |
| vibrationEnabled | bool | yes | Vibration toggle |
| sensitivity | double | yes | Detection sensitivity (0.0-1.0) |

## Entity: Invite
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | String | yes | Unique identifier |
| beaconId | String | yes | Beacon to monitor |
| inviterId | String | yes | User who sent invite |
| inviterName | String | yes | Inviter display name |
| code | String | yes | Invite code/URL |
| status | InviteStatus | yes | pending / accepted / rejected / expired |
| createdAt | DateTime | yes | Creation timestamp |
| expiresAt | DateTime? | no | Expiration timestamp |

## Enums

### GuardianRole
- `owner` — Primary guardian (can manage others)
- `guardian` — Secondary guardian (monitoring access)

### ProximityStatus
- `near` (Đang gần) — User is within beacon range
- `far` (Xa beacon) — User is outside beacon range
- `offline` (Ngoại tuyến) — User is not connected
- `paused` (Tạm dừng) — User paused notifications

### EventType
- `disconnect` — Beacon signal lost
- `reconnect` — Beacon signal restored
- `alert` — Emergency alert triggered
- `safe` — Entered safe zone

### MonitoredStatus
- `safe` (Đang an toàn) — Beacon is in range
- `near` (Gần beacon) — Beacon is nearby
- `weak` (Tín hiệu yếu) — Weak signal
- `lost` (Mất beacon) — Beacon not found
- `alert` (Khẩn cấp) — Emergency alert active

### InviteStatus
- `pending` — Awaiting acceptance
- `accepted` — User joined monitoring
- `rejected` — User declined invitation
- `expired` — Invite no longer valid

## Relationships
```
User (1) ────── (*) Beacon     // Owner monitors many beacons
User (1) ────── (*) Invite    // User sends many invites
Beacon (1) ──── (*) User      // Beacon has many co-guardians
Beacon (1) ────── (*) Event   // Beacon generates many events
SafeZone is standalone (no relationships)
Event belongs to Beacon (via beaconId)
AlertConfig is singleton (global settings)
```

## Mock Data Requirements
- **3-5 Users/Guardians** with varied roles and proximity statuses
- **2-4 Beacons** with names like "Bé Na", "Beacon #8210"
- **3-5 SafeZones** (Home, School, Grandma's House) with varied active states
- **8-12 Events** spanning Today, Yesterday, Last 7 Days
- **1 AlertConfig** with default timeout of 2 minutes
- **1 Invite** in pending state for onboarding flow
- Realistic Vietnamese names for child/guardian display
- Realistic addresses and zone names

## Screen-to-Model Mapping
| Screen | Primary Entities |
|--------|------------------|
| HomeScreen | Beacon, User, AlertConfig |
| BeaconScannerScreen | Beacon (discovered) |
| BeaconDetailScreen | Beacon, User (co-guardians) |
| SafeZonesScreen | SafeZone |
| AddSafeZoneScreen | SafeZone (new) |
| HistoryScreen | Event |
| SettingsScreen | AlertConfig, User |
| AlertScreen | Beacon, AlertConfig |
| OnboardingScreen | Permission (not persisted) |
| GuardiansScreen | User |
| InviteAcceptScreen | Invite, Beacon, User |
