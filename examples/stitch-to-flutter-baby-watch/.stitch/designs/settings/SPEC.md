# Screen Specification: Settings

**Fidelity Source:** `.stitch/references/settings/code.html`

---
## 1. Screen Title
Settings

## 2. Purpose
Configure alert behavior, timeout, and app preferences. Manage profile, alert settings, beacon setup, and mute controls.

## 3. Route
`/settings`

## 4. Widget Name
`SettingsScreen`

## 5. Design Tokens

| Token | Hex | Usage |
|-------|-----|-------|
| Warm Canvas | `#fbf9f5` | App background |
| Surface Container Low | `#f5f4ee` | Section backgrounds |
| Surface Container Lowest | `#ffffff` | Cards |
| Secondary | `#5e5f5f` | Primary buttons, active toggles |
| Tertiary | `#4f635e` | Accent |
| Error | `#9e422c` | Destructive |
| Off-Black Charcoal | `#31332e` | Primary text |
| Muted Stone | `#5e6059` | Secondary text |

**Typography:** Plus Jakarta Sans headlines, Manrope body/labels

## 6. Layout Rules

**Scaffold:** AppBar with back + overflow menu. Body: ListView with grouped sections. Bottom nav visible. No FAB.

## 7. Sections

### 7.1 Profile Section
- Profile photo with verified badge
- Name "Elena Fisher"
- "Premium Guardian Plan" chip

### 7.2 Alert Settings Card
- Timeout interval picker (2/5/10 min segmented control)
- Audio Alert toggle
- Vibration toggle

### 7.3 Beacon Setup Card
- RSSI Threshold slider (-75 dBm display)
- Scan Interval selector (15 seconds)

### 7.4 Mute Notifications
- Horizontal scrollable pill buttons: 5 min / 10 min / 15 min

### 7.5 General Section
- System Permissions row → chevron
- Do Not Disturb toggle

### 7.6 Sign Out
- Destructive ghost button: "Sign Out"

## 8. Data

| Entity | Fields |
|--------|--------|
| AlertConfig | timeoutSeconds, audioEnabled, vibrationEnabled, sensitivity |
| User | displayName, avatarUrl, role |

## 9. Motion

- Segmented control: 200ms ease
- Toggle switch: 200ms ease
- Slider: real-time
- Sign out button: scale(0.98) on press

## 10. Anti-Patterns

- Do NOT use pure black (#000000)
- Do NOT use Inter font
- Do NOT animate layout properties