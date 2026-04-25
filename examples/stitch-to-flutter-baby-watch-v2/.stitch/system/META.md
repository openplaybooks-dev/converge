# BabyGuard

- **App Type:** Child-safety / proximity monitoring
- **Tags:** ble-beacon, proximity-alerts, safe-zones, co-guardians, editorial-minimal
- **Platform:** Mobile (375px base width)
- **Interaction Density:** Medium
- **Target Framework:** Flutter (Material 3)

## Screens

| File | Pattern | Description |
|------|---------|-------------|
| `single-screen.html` | Single Screen | Home dashboard in safe state — map card, beacon strip, mint status pill, push-mute chips. |
| `multi-state-screen.html` | Multi-State | Add Beacon scanning flow showing scanning / found / paired states side-by-side. |
| `celebration-screen.html` | Celebration | Post-pairing milestone — beacon successfully paired with co-guardian invite CTA. |

## Key Patterns

- Tonal stacking (no borders) — `surface` → `surface_container_low` → `surface_container_lowest` define structure.
- Status pills as stateful color cues — mint (safe), honey (weak), peach (alert).
- Asymmetric breathing room — generous 24-40dp vertical rhythm, no 8dp grid.
- Pill-shaped primary buttons (56px, full radius) on soft-black `on_surface`.
- Editorial display type (Plus Jakarta Sans, -0.02em) paired with Manrope body.
