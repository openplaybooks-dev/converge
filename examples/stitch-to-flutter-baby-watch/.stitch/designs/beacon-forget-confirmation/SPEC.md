# Screen Specification: Beacon Forget Confirmation

**Fidelity Source:** Generated from UX.md §3.3 Beacon Detail overflow menu "Forget beacon"

---
## 1. Screen Title
Beacon Forget Confirmation (dialog)

## 2. Purpose
Confirmation dialog when user selects "Forget beacon" from the Beacon Detail overflow menu.

## 3. Route
`overlay:confirm` (alert dialog)

## 4. Widget Name
`BeaconForgetDialog`

## 5. Design Tokens

| Token | Hex | Usage |
|-------|-----|-------|
| Surface Container Lowest | `#ffffff` | Dialog background |
| Terracotta Alert | `#9f403d` | Destructive action |
| Peach Tint | `#EED9D2` | Button background |
| Off-Black Charcoal | `#31332e` | Primary text |
| Muted Stone | `#5e6059` | Secondary text |

**Typography:** Plus Jakarta Sans headlines, Manrope body

## 6. Layout Rules

**Scaffold:** Alert dialog — centered card with rounded-xl, max-width 320px.

## 7. Sections

### 7.1 Title
- "Quên beacon?" — bold headline

### 7.2 Description
- Warning text explaining consequences
- "Bạn sẽ không còn nhận thông báo từ beacon này."

### 7.3 Actions
- "Hủy" — text button (left)
- "Quên" — destructive button (right), terracotta text

## 8. Motion

- Dialog: fade in 200ms easeOut
- Button press: scale(0.98)

## 9. Anti-Patterns

- Do NOT use pure black (#000000)
- Do NOT use Inter font