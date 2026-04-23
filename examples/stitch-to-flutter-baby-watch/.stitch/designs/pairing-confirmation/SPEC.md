# Screen Specification: Pairing Confirmation

**Fidelity Source:** Generated from UX.md §3.7 and design system

---
## 1. Screen Title
Pairing Confirmation (bottom sheet)

## 2. Purpose
Bottom sheet to confirm beacon pairing. Shows discovered beacon info and confirm/cancel actions.

## 3. Route
`overlay:pairing`

## 4. Widget Name
`PairingConfirmationSheet`

## 5. Design Tokens

| Token | Hex | Usage |
|-------|-----|-------|
| Surface Container Lowest | `#ffffff` | Sheet background |
| Off-Black Charcoal | `#31332e` | Primary text |
| Muted Stone | `#5e6059` | Secondary text |
| Earthy Mint | `#4f635e` | Accent |
| Mint Tint | `#CDE3DC` | Beacon icon bg |

**Typography:** Plus Jakarta Sans headlines, Manrope body

## 6. Layout Rules

**Scaffold:** Bottom sheet only — slides up from bottom. No AppBar, no nav.
**Top:** Drag handle pill (32×4px, centered)
**Content:** Centered card with beacon info + actions

## 7. Sections

### 7.1 Drag Handle
- 32px × 4px pill, ghost border, centered

### 7.2 Beacon Info Card
- Large sensor icon in mint circle
- Beacon name ("Bé Na")
- UUID preview
- RSSI signal strength indicator

### 7.3 Action Buttons
- "Ghép nối" — primary button, full-width, earthy mint fill
- "Hủy" — text button

## 8. Motion

- Bottom sheet: easeOutCubic 250ms slide up
- Buttons: scale(0.98) on press

## 9. Anti-Patterns

- Do NOT use pure black (#000000)
- Do NOT use Inter font
- Do NOT animate layout properties