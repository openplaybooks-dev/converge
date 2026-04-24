# BabyGuard

- **App Type:** Child Safety Beacon Monitoring
- **Tags:** beacon, monitoring, safety, alerts, family
- **Platform:** Mobile (375px base width)
- **Interaction Density:** Medium
- **Target Framework:** Flutter (Material 3)

## Screens

| File | Pattern | Description |
|------|---------|-------------|
| `single-screen.html` | Single Screen | Home dashboard with safe status, beacon strip, and push mute |
| `multi-state-screen.html` | Multi-State | History with safe/alert event cards and filter bar |
| `celebration-screen.html` | Celebration | Beacon pairing success with confirmation |

## Key Patterns

- Status pills with mint/peach/honey tints for safe/alert/weak states
- Editorial card stacking with generous corner radius (24dp)
- Bottom navigation with 4 tabs (Home, Devices, Security, Settings)
- Tonal layering via surface container backgrounds
- Spring physics press feedback (scale 0.98)
