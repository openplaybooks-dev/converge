# Screen Specification: Edit Safe Zone

**Fidelity Source:** Generated from UX.md §3.5 Edit Safe Zone screen

---
## 1. Screen Title
Edit Safe Zone

## 2. Purpose
Modify existing safe zone configuration — name, address, radius, active toggle.

## 3. Route
`/safe-zones/:id/edit`

## 4. Widget Name
`EditSafeZoneScreen`

## 5. Design Tokens

| Token | Hex | Usage |
|-------|-----|-------|
| Warm Canvas | `#fbf9f5` | App background |
| Surface Container Lowest | `#ffffff` | Cards, inputs |
| Surface Container Low | `#f5f4ee` | Section backgrounds |
| Off-Black Charcoal | `#31332e` | Primary text |
| Muted Stone | `#5e6059` | Secondary text |
| Earthy Mint | `#4f635e` | Accent |

**Typography:** Plus Jakarta Sans headlines, Manrope body/labels

## 6. Layout Rules

**Scaffold:** AppBar with back + "Chỉnh sửa" title + Save button. Body: scrollable form. No bottom nav. No FAB.

## 7. Sections

Same as Add Safe Zone, plus:
- Delete button (destructive, ghost)

## 8. Data

| Entity | Fields |
|--------|--------|
| SafeZone | id, name, address, latitude, longitude, radiusMeters, isActive |

## 9. Motion

- Same as Add Safe Zone

## 10. Anti-Patterns

- Do NOT use pure black (#000000)
- Do NOT use Inter font