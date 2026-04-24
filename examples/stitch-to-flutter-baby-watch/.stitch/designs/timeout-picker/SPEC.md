# Screen Specification: Timeout Picker

**Fidelity Source:** Generated from UX.md §3.8 Settings timeout picker

---
## 1. Screen Title
Timeout Picker (bottom sheet)

## 2. Purpose
Bottom sheet to select alert timeout duration. Shows preset options and custom input.

## 3. Route
`overlay:timeout-picker`

## 4. Widget Name
`TimeoutPickerSheet`

## 5. Design Tokens

| Token | Hex | Usage |
|-------|-----|-------|
| Surface Container Lowest | `#ffffff` | Sheet background |
| Off-Black Charcoal | `#31332e` | Primary text |
| Muted Stone | `#5e6059` | Secondary text |
| Earthy Mint | `#4f635e` | Selected state |
| Surface Container Low | `#f5f4ee` | Unselected state |

**Typography:** Plus Jakarta Sans headlines, Manrope body/labels

## 6. Layout Rules

**Scaffold:** Bottom sheet only. No AppBar, no nav.
**Top:** Drag handle + title "Chọn thời gian chờ"
**Content:** List of timeout options

## 7. Sections

### 7.1 Drag Handle
- 32×4px pill, centered, ghost border

### 7.2 Title
- "Chọn thời gian chờ" — headline

### 7.3 Timeout Options
- 2 phút — pill button
- 5 phút — pill button (recommended badge)
- 10 phút — pill button
- Custom input option

### 7.4 Confirm Button
- "Xác nhận" — primary action

## 8. Motion

- Bottom sheet: easeOutCubic 250ms
- Pill selection: background shift 200ms

## 9. Anti-Patterns

- Do NOT use pure black (#000000)
- Do NOT use Inter font