# Screen Specification: Beacon Pairing Confirmation

**Fidelity Source:** Generated from UX.md §3.7 Beacon Scanner pairing flow

---
## 1. Screen Title
Beacon Pairing Confirmation (dialog)

## 2. Purpose
Confirmation dialog when user taps a discovered beacon to pair from the scanner screen.

## 3. Route
`overlay:pairing` (alert dialog variant)

## 4. Widget Name
`BeaconPairingDialog`

## 5. Design Tokens

| Token | Hex | Usage |
|-------|-----|-------|
| Surface Container Lowest | `#ffffff` | Dialog background |
| Earthy Mint | `#4f635e` | Confirm action |
| Mint Tint | `#CDE3DC` | Beacon icon background |
| Off-Black Charcoal | `#31332e` | Primary text |
| Muted Stone | `#5e6059` | Secondary text |

**Typography:** Plus Jakarta Sans headlines, Manrope body

## 6. Layout Rules

**Scaffold:** Alert dialog — centered card with rounded-xl.

## 7. Sections

### 7.1 Beacon Info
- Sensor icon in mint circle
- Beacon name
- UUID preview
- RSSI signal indicator

### 7.2 Actions
- "Ghép nối" — primary button, full-width, earthy mint fill
- "Hủy" — text button

## 8. Motion

- Dialog: fade in 200ms
- Button press: scale(0.98)

## 9. Anti-Patterns

- Do NOT use pure black (#000000)
- Do NOT use Inter font