# Screen Specification: Beacon Edit

**Fidelity Source:** Generated from UX.md §3.3 Beacon Detail edit flow + design system

---
## 1. Screen Title
Beacon Edit

## 2. Purpose
Edit beacon name and configuration. Accessed via overflow menu on Beacon Detail screen.

## 3. Route
`/beacon/:id/edit`

## 4. Widget Name
`BeaconEditScreen`

## 5. Design Tokens

| Token | Hex | Usage |
|-------|-----|-------|
| Warm Canvas | `#F4F2EE` | App background |
| Surface Container Lowest | `#ffffff` | Cards, inputs |
| Surface Container Low | `#f5f4ee` | Section backgrounds |
| Off-Black Charcoal | `#31332e` | Primary text |
| Muted Stone | `#5e6059` | Secondary text |
| Earthy Mint | `#4f635e` | Accent |
| Mint Tint | `#CDE3DC` | Icon background |
| Peach Tint | `#EED9D2` | Delete button bg |
| Terracotta Alert | `#9f403d` | Delete button text |

**Typography:** Plus Jakarta Sans headlines (700/800), Manrope body/labels (400–600)

## 6. Layout Rules

**Scaffold:** AppBar with back + "Chỉnh sửa beacon" title + Save button. Body: scrollable form. No bottom nav. No FAB.

## 7. Sections

### 7.1 Avatar Section
- Centered 96×96dp circle with child_care icon (filled) on mint background
- "Đổi biểu tượng" text button below

### 7.2 Form Fields
- **Name Field:** Text input, "Tên Beacon" label, pre-filled with current name
- **UUID Display:** Read-only mono text field showing beacon UUID
- **Major/Minor Grid:** 2-column grid with number inputs
- **TX Power Field:** Number input with "TX Power (dBm)" label and helper text "Cường độ tín hiệu hiệu chuẩn tại 1m"

### 7.3 Delete Button
- Full-width, "Xóa Beacon" label with delete icon
- Peach tint background, terracotta text

## 8. Data

| Entity | Fields |
|--------|--------|
| Beacon | id, name, uuid, major, minor, txPower |

## 9. Motion

- Save button: scale(0.98) on press
- Delete button: scale(0.98) on press
- Input focus: border + ring transition 200ms

## 10. Anti-Patterns

- Do NOT use pure black (#000000)
- Do NOT use Inter font
- Do NOT animate layout properties
- Do NOT use 3-column grids