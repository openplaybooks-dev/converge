# Screen Specification: Event Detail

**Fidelity Source:** Generated from UX.md §3.6 History event detail

---
## 1. Screen Title
Event Detail (bottom sheet)

## 2. Purpose
Bottom sheet showing single history event details — timestamp, duration, safe zone context.

## 3. Route
`overlay:event-detail`

## 4. Widget Name
`EventDetailSheet`

## 5. Design Tokens

| Token | Hex | Usage |
|-------|-----|-------|
| Surface Container Lowest | `#ffffff` | Sheet background |
| Off-Black Charcoal | `#31332e` | Primary text |
| Muted Stone | `#5e6059` | Secondary text |
| Earthy Mint | `#4f635e` | Safe event icon |
| Terracotta Alert | `#9f403d` | Alert event icon |

**Typography:** Plus Jakarta Sans headlines, Manrope body/labels

## 6. Layout Rules

**Scaffold:** Bottom sheet only. No AppBar, no nav.

## 7. Sections

### 7.1 Drag Handle
- 32×4px pill, centered

### 7.2 Event Icon + Type
- Large icon (disconnect/reconnect/alert)
- Event type label

### 7.3 Timestamp
- Exact date/time of event

### 7.4 Duration
- How long the event lasted
- Safe zone name if applicable

### 7.5 Status
- Was acknowledged: yes/no

### 7.6 Close Button
- "Đóng" — text button

## 8. Motion

- Bottom sheet: easeOutCubic 250ms

## 9. Anti-Patterns

- Do NOT use pure black (#000000)
- Do NOT use Inter font