# Screen Specification: History

**Fidelity Source:** `.stitch/references/history/code.html`

---
## 1. Screen Title
History

## 2. Purpose
Chronological log of disconnection/reconnection events. View event cards grouped by date with filter functionality.

## 3. Route
`/history`

## 4. Widget Name
`HistoryScreen`

## 5. Design Tokens

| Token | Hex | Usage |
|-------|-----|-------|
| Warm Canvas | `#fbf9f5` | App background |
| Surface Container Low | `#f5f4ee` | Section backgrounds |
| Surface Container Lowest | `#ffffff` | Cards |
| Earthy Mint | `#4f635e` | Safe state icons |
| Terracotta Alert | `#9f403d` | Alert state icons |
| Off-Black Charcoal | `#31332e` | Primary text |
| Muted Stone | `#5e6059` | Secondary text |

**Typography:** Plus Jakarta Sans headlines, Manrope body/labels

## 6. Layout Rules

**Scaffold:** AppBar with back button + filter icon. Body: ListView grouped by date headers. No bottom nav. No FAB.

## 7. Sections

### 7.1 Date Header
- "Today" / "Yesterday" / date string
- Uppercase label style

### 7.2 Event Cards
- Event type icon (disconnect/reconnect/alert)
- Timestamp + duration
- Safe zone context
- Status indicator
- Tap → Event Detail bottom sheet

### 7.3 Filter Bar
- Collapsible date range selector
- Filter icon in AppBar triggers bottom sheet

## 8. Data

| Entity | Fields |
|--------|--------|
| Event | id, beaconId, type, timestamp, durationSeconds, safeZoneId, wasAcknowledged |

## 9. Motion

- Page transition: 300ms easeInOut
- List stagger: 50ms per item
- Press feedback: scale(0.98)

## 10. Anti-Patterns

- Do NOT use pure black (#000000)
- Do NOT use Inter font
- Do NOT animate layout properties