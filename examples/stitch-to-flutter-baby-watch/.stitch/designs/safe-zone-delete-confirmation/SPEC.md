# Screen Specification: Safe Zone Delete Confirmation

**Fidelity Source:** Generated from UX.md §3.4 Safe Zones swipe-delete

---
## 1. Screen Title
Safe Zone Delete Confirmation (dialog)

## 2. Purpose
Confirmation dialog when user swipes to delete a safe zone from the list.

## 3. Route
`overlay:confirm`

## 4. Widget Name
`SafeZoneDeleteDialog`

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

**Scaffold:** Alert dialog — centered card with rounded-xl.

## 7. Sections

### 7.1 Title
- "Xóa vùng an toàn?" — bold headline

### 7.2 Description
- Warning text
- "Vùng này sẽ bị xóa vĩnh viễn."

### 7.3 Actions
- "Hủy" — text button
- "Xóa" — destructive button, terracotta

## 8. Motion

- Dialog: fade in 200ms easeOut
- Button press: scale(0.98)

## 9. Anti-Patterns

- Do NOT use pure black (#000000)
- Do NOT use Inter font