# Screen Specification: Filter Date Range

**Fidelity Source:** Generated from UX.md §3.6 History filter date range picker

---
## 1. Screen Title
Filter Date Range (bottom sheet)

## 2. Purpose
Bottom sheet to filter history events by custom date range. Select start and end dates.

## 3. Route
`overlay:filter-date`

## 4. Widget Name
`FilterDateRangeSheet`

## 5. Design Tokens

| Token | Hex | Usage |
|-------|-----|-------|
| Surface Container Lowest | `#ffffff` | Sheet background |
| Off-Black Charcoal | `#31332e` | Primary text |
| Muted Stone | `#5e6059` | Secondary text |
| Earthy Mint | `#4f635e` | Accent, selected state |

**Typography:** Plus Jakarta Sans headlines, Manrope body/labels

## 6. Layout Rules

**Scaffold:** Bottom sheet — slides up from bottom, rounded top corners.

## 7. Sections

### 7.1 Drag Handle
- 32×4px pill, centered, ghost border

### 7.2 Title
- "Chọn khoảng ngày"

### 7.3 Date Inputs
- From date field (text input, triggers date picker on tap)
- To date field (text input, triggers date picker on tap)

### 7.4 Preset Options
- "Hôm nay"
- "7 ngày qua"
- "30 ngày qua"
- "Tùy chỉnh" (selects custom range)

### 7.5 Actions
- "Áp dụng" — primary button
- "Hủy" — text button

## 8. Motion

- Bottom sheet: easeOutCubic 250ms slide up
- Date selection: showDatePicker dialog

## 9. Anti-Patterns

- Do NOT use pure black (#000000)
- Do NOT use Inter font