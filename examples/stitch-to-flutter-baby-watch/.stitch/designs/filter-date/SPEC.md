# Screen Specification: Filter Date Range

**Fidelity Source:** Generated from UX.md §3.6 History filter

---
## 1. Screen Title
Filter Date Range (bottom sheet)

## 2. Purpose
Bottom sheet to filter history by date range. Date range picker interface.

## 3. Route
`overlay:filter-date`

## 4. Widget Name
`FilterDateSheet`

## 5. Design Tokens

| Token | Hex | Usage |
|-------|-----|-------|
| Surface Container Lowest | `#ffffff` | Sheet background |
| Off-Black Charcoal | `#31332e` | Primary text |
| Muted Stone | `#5e6059` | Secondary text |
| Earthy Mint | `#4f635e` | Accent |

**Typography:** Plus Jakarta Sans headlines, Manrope body/labels

## 6. Layout Rules

**Scaffold:** Bottom sheet only. No AppBar, no nav.
**Top:** Drag handle + title "Lọc theo ngày"

## 7. Sections

### 7.1 Drag Handle
- 32×4px pill, centered

### 7.2 Title
- "Lọc theo ngày"

### 7.3 Preset Options
- Hôm nay
- 7 ngày qua
- 30 ngày qua
- Tùy chỉnh

### 7.4 Custom Date Picker
- From date input
- To date input

### 7.5 Apply Button
- "Áp dụng" — primary action

## 8. Motion

- Bottom sheet: easeOutCubic 250ms

## 9. Anti-Patterns

- Do NOT use pure black (#000000)
- Do NOT use Inter font