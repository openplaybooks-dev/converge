# Screen Specification: Test Alert Countdown

**Fidelity Source:** Generated from UX.md §3.1 Home screen long-press interaction

---
## 1. Screen Title
Test Alert Countdown (bottom sheet)

## 2. Purpose
Bottom sheet triggered by long-pressing the status orb on the Home screen. Shows countdown from 5 before test alert fires.

## 3. Route
`overlay:test-alert`

## 4. Widget Name
`TestAlertCountdownSheet`

## 5. Design Tokens

| Token | Hex | Usage |
|-------|-----|-------|
| Surface Container Lowest | `#ffffff` | Sheet background |
| Terracotta Alert | `#9f403d` | Countdown number color |
| Peach Tint | `#FFDAD6` | Countdown background |
| Off-Black Charcoal | `#31332e` | Primary text |
| Muted Stone | `#5e6059` | Secondary text |

**Typography:** Plus Jakarta Sans display (700), Manrope body/labels

## 6. Layout Rules

**Scaffold:** Bottom sheet — slides up from bottom, rounded top corners (3rem).

## 7. Sections

### 7.1 Drag Handle
- 32×4px pill, centered, ghost border

### 7.2 Title
- "Thử cảnh báo" — bold headline

### 7.3 Countdown Display
- Large number (5rem+) in terracotta color
- Background: peach tint rounded-full
- "Giây" label below number
- Animated tick (decrement every second)

### 7.4 Warning Text
- "Cảnh báo sẽ phát trong X giây"

### 7.5 Cancel Button
- "Hủy" — large text button, full-width

## 8. Motion

- Countdown: 1 second interval ticks with scale animation
- Bottom sheet: easeOutCubic 250ms slide up
- Cancel button: scale(0.98) on press

## 9. Accessibility

- Screen reader announcement on each tick
- Large countdown number for visibility

## 10. Anti-Patterns

- Do NOT use pure black (#000000)
- Do NOT use Inter font
- Do NOT use linear easing