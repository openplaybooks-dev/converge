# Screen Specification: Safe Zones

**Fidelity Source:** `.stitch/references/safe_zones/code.html`

---
## 1. Screen Title
Safe Zones

## 2. Purpose
Manage locations where alerts are suppressed. View active/inactive safe zones on a map and control them via toggle switches.

## 3. Route
`/safe-zones`

## 4. Widget Name
`SafeZonesScreen`

## 5. Design Tokens

| Token | Hex | Usage |
|-------|-----|-------|
| Warm Canvas | `#fbf9f5` | App background |
| Surface Container Low | `#f5f4ee` | Section backgrounds |
| Surface Container Lowest | `#ffffff` | Cards |
| Earthy Mint | `#4f635e` | Safe state, active toggle |
| Off-Black Charcoal | `#31332e` | Primary text |
| Muted Stone | `#5e6059` | Secondary text |

**Typography:** Plus Jakarta Sans headlines, Manrope body/labels

## 6. Layout Rules

**Scaffold:** AppBar with title and profile avatar, no back button (tab root). Body: scrollable list. Bottom nav visible. FAB for add.

## 7. Sections

### 7.1 Hero Section
- "Guardian Overlook" label (uppercase, muted)
- Headline "Peace of mind, defined by boundaries."

### 7.2 Mini Map Card
- 256px height card with map image (grayscale)
- Pulsing safe zone circles overlay
- Baby marker in center
- Glassmorphism overlay: "Tracking Active" + "3 Active Zones Monitored" + LIVE badge

### 7.3 Active Zones List
- Section header "Active Zones"
- Zone cards with:
  - Icon (home/school/favorite) in circle
  - Zone name + radius badge
  - Address (truncated)
  - Toggle switch (active/inactive)
  - Edit button

### 7.4 Insights Preview
- 2-column grid: "24 Alerts" card + "98% Secure" card

## 8. Data

| Entity | Fields |
|--------|--------|
| SafeZone | name, address, radiusMeters, isActive |
| ZoneStats | alertCount, securityPercent |

## 9. Motion

- Map marker: pulsing ring (1000ms loop)
- Toggle: 200ms easeInOut
- Cards: scale(0.99) on press

## 10. Anti-Patterns

- Do NOT use pure black (#000000)
- Do NOT use Inter font
- Do NOT animate layout properties
- Do NOT use 3-column grids