# Screen Specification: Alert Screen

**Fidelity Source:** Generated from UX.md §3.8 and BabyGuard design system

---
## 1. Screen Title
Alert Screen (full-screen modal)

## 2. Purpose
High-priority alert when a child is left behind — full-screen emergency modal that demands immediate attention. No navigation chrome. Center-focused layout with pulsing warning icon, countdown timer, and acknowledge button.

## 3. Route
`overlay:alert` (full-screen modal, no nav)

## 4. Widget Name
`AlertScreen`

## 5. Design Tokens

| Token | Hex | Usage |
|-------|-----|-------|
| Warm Canvas | `#fbf9f5` | App background |
| Terracotta Alert | `#9f403d` | Alert state, pulsing icon |
| Peach Tint | `#FFDAD6` | Alert state pill background |
| On Error | `#faf7f6` | Text on error |
| Off-Black Charcoal | `#31332e` | Primary text |

**Typography:** Plus Jakarta Sans for headlines (700), Manrope for body/labels (400–500)

## 6. Layout Rules

**Scaffold:** Full screen — no AppBar, no Bottom Nav, no FAB
**Layout:** Center-focused, vertically stacked

## 7. Sections

### 7.1 Pulsing Alert Icon
- Large (80×80dp) warning icon in terracotta
- Infinite pulse animation at 1000ms easeInOut loop
- Concentric ring expansion effect

### 7.2 Status Text
- "KHẨN CẤP" — Display LG, bold, terracotta
- "Không thấy beacon" — Body LG, secondary text

### 7.3 Countdown Timer
- Seconds remaining display
- Large countdown number

### 7.4 Sound/Vibration Indicators
- Icon indicators showing active alert modes

### 7.5 Acknowledge Button
- Large "Tôi đã kiểm tra" button
- Full-width, rounded-full, 56px height minimum
- Terracotta fill with white text

## 8. Motion

| Element | Animation | Duration |
|---------|-----------|----------|
| Alert icon | Pulsing scale + opacity | 1000ms loop |
| Countdown | Number decrement | 1s intervals |
| Button | scale(0.98) on press | 100ms |

## 9. Accessibility

- Full-screen modal blocks background interaction
- Large touch target on acknowledge button (56px minimum)
- Screen reader announcement on appear

## 10. Anti-Patterns

- Do NOT use pure black (#000000)
- Do NOT use Inter font
- Do NOT animate layout properties
- Do NOT use linear easing