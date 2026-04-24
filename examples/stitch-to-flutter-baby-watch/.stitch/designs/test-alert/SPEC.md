# Screen Specification: Test Alert Countdown

**Fidelity Source:** Generated from UX.md §3.1 Home screen long-press interaction

---
## 1. Screen Title
Test Alert Countdown (bottom sheet)

## 2. Purpose
Bottom sheet triggered by long-pressing status orb on Home screen. Shows countdown before test alert fires.

## 3. Route
`overlay:test-alert`

## 4. Widget Name
`TestAlertSheet`

## 5. Design Tokens

| Token | Hex | Usage |
|-------|-----|-------|
| Surface Container Lowest | `#ffffff` | Sheet background |
| Terracotta Alert | `#9f403d` | Countdown/alert color |
| Peach Tint | `#FFDAD6` | Countdown background |
| Off-Black Charcoal | `#31332e` | Primary text |
| Muted Stone | `#5e6059` | Secondary text |

**Typography:** Plus Jakarta Sans headlines (700), Manrope body/labels

## 6. Layout Rules

**Scaffold:** Bottom sheet only. No AppBar, no nav.
**Top:** Drag handle + title "Thử cảnh báo"

## 7. Sections

### 7.1 Drag Handle
- 32×4px pill, centered

### 7.2 Title
- "Thử cảnh báo"

### 7.3 Countdown Display
- Large number countdown (5, 4, 3, 2, 1)
- "Giây" label
- Progress indicator

### 7.4 Warning Text
- "Cảnh báo sẽ phát trong X giây"

### 7.5 Cancel Button
- "Hủy" — text button, prominent

## 8. Motion

- Countdown: 1 second interval ticks
- Bottom sheet: easeOutCubic 250ms

## 9. Anti-Patterns

- Do NOT use pure black (#000000)
- Do NOT use Inter font
- Do NOT use linear easing