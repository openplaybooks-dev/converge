# Screen Specification: Accept Invitation

**Fidelity Source:** `.stitch/references/co_guardians_list_phase_2/code.html`

---
## 1. Screen Title
Accept Invitation

## 2. Purpose
Accept invitation to monitor a beacon as co-guardian. Shows beacon info, inviter name, and accept/reject actions.

## 3. Route
`/invite/:code`

## 4. Widget Name
`InviteAcceptScreen`

## 5. Design Tokens

| Token | Hex | Usage |
|-------|-----|-------|
| Warm Canvas | `#fbf9f5` | App background |
| Surface Container Lowest | `#ffffff` | Card fill |
| Earthy Mint | `#4f635e` | Safe accent |
| Mint Tint | `#CDE3DC` | Beacon icon bg |
| Off-Black Charcoal | `#31332e` | Primary text |
| Muted Stone | `#5e6059` | Secondary text |

**Typography:** Plus Jakarta Sans headlines, Manrope body/labels

## 6. Layout Rules

**Scaffold:** AppBar with back button and "Lời mời theo dõi" title. Body: centered card layout. No bottom nav. No FAB.

## 7. Sections

### 7.1 Centered Card
- Beacon info section:
  - Avatar circle with child_care icon
  - Beacon name
  - Inviter name + role
- Trust note: "Chỉ chia sẻ vị trí gần - không theo dõi GPS trực tiếp"

### 7.2 Action Buttons
- "Chấp nhận" — primary button, full-width rounded-full, earthy mint fill
- "Từ chối" — ghost button, text only

## 8. Data

| Entity | Fields |
|--------|--------|
| Invitation | beaconName, inviterName, role |
| Beacon | name |
| User | displayName |

## 9. Motion

- Card: fade in (200ms)
- Buttons: scale(0.98) on press

## 10. Anti-Patterns

- Do NOT use pure black (#000000)
- Do NOT use Inter font
- Do NOT center hero sections (this IS a centered card, but it's a modal-like screen)