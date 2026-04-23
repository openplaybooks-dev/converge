# Screen Specification: Co-Guardians List

**Fidelity Source:** `.stitch/references/ch_p_nh_n_l_i_m_i/code.html`

---
## 1. Screen Title
Co-Guardians

## 2. Purpose
Manage co-guardian family members. View guardian cards with status, add new guardians via invite, remove guardians via swipe.

## 3. Route
`/guardians`

## 4. Widget Name
`CoGuardiansScreen`

## 5. Design Tokens

| Token | Hex | Usage |
|-------|-----|-------|
| Warm Canvas | `#fbf9f5` | App background |
| Surface Container Lowest | `#ffffff` | Cards |
| Earthy Mint | `#4f635e` | Safe state |
| Mint Tint | `#CDE3DC` | Safe status pill |
| Off-Black Charcoal | `#31332e` | Primary text |
| Muted Stone | `#5e6059` | Secondary text |
| Honey Tint | `#F3D98C` | Far status pill |
| Peach Tint | `#EED9D2` | Offline status pill |

**Typography:** Plus Jakarta Sans headlines, Manrope body/labels

## 6. Layout Rules

**Scaffold:** AppBar with back + Add button. Body: ListView of guardian cards. No bottom nav. FAB for add.

## 7. Sections

### 7.1 Guardian Cards
- Avatar circle with initials + colored background
- Name (bold)
- Last update time (uppercase label)
- Status pill (Đang gần beacon / Xa / Ngoại tuyến)
- Remove button (swipe left)

### 7.2 Add Button
- AppBar trailing action
- Opens invite options (QR code, link)

### 7.3 Pull-to-refresh
- Refresh guardian list

## 8. Data

| Entity | Fields |
|--------|--------|
| Guardian | id, displayName, initials, avatarColor, proximityStatus, lastSeen |

## 9. Motion

- Swipe-to-remove: slide left with red background
- Card press: scale(0.98)
- FAB: scale on press

## 10. Anti-Patterns

- Do NOT use pure black (#000000)
- Do NOT use Inter font
- Do NOT use generic names like "John Doe"