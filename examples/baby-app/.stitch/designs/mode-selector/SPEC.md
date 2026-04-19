# Overlay Spec: Mode Selection

## 1. Overlay Title
Mode Selection

## 2. Overlay Type
**bottom-sheet**

## 3. Parent Screen
**home** (`lib/screens/home/home_screen.dart`)

## 4. Trigger
Tap the `ModeSelectorPill` widget on the home screen (line 67–103 in `home_screen.dart`). The pill displays "Mode: [Current Mode]" with a chevron-down icon. The existing implementation already calls `showModalBottomSheet()` with a placeholder `Column` containing two `ListTile` items — the `05-mount` step should replace this inline builder with the proper `ModeSelector` overlay widget.

### Existing Placeholder Pattern
```dart
ModeSelectorPill(
  modeLabel: 'Pregnancy Mode',
  onTap: () {
    showModalBottomSheet(
      context: context,
      builder: (_) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // ... placeholder ListTile items
          ],
        ),
      ),
    );
  },
),
```
The `builder` callback should be replaced with `(_) => const ModeSelector()`.

## 5. Purpose
Allows the user to switch between tracking modes — **Pregnancy**, **Wellness**, and **Postpartum**. Each mode changes the app's background canvas gradient, hero content, and contextual features. This overlay exists because mode switching is a global, infrequent action that should not occupy permanent screen real estate but must be easily discoverable from the home screen.

## 6. Widget Name
`ModeSelector`

## 7. Design Tokens

### Colors
| Token | Value | Usage |
|-------|-------|-------|
| Cloud White | `#FFFFFF` | Sheet background |
| Coral Bloom | `#F28B8B` | Pregnancy mode icon, selected state accent |
| Lilac Pulse | `#8B7ED8` | Wellness mode icon, data accent |
| Coral Whisper | `rgba(242, 139, 139, 0.12)` | Selected option background tint |
| Lilac Whisper | `rgba(139, 126, 216, 0.14)` | Hover/press highlight |
| Chip Mist | `rgba(139, 126, 216, 0.08)` | Drag handle color |
| Ink Charcoal | `#2A2A3A` | Mode label primary text |
| Muted Quartz | `#8B8B9C` | Mode description secondary text |
| Dim Veil | `rgba(42, 42, 58, 0.24)` | Backdrop overlay behind sheet |

### Typography
| Role | Scale | Weight | Usage |
|------|-------|--------|-------|
| Sheet title | Subheading (1.125rem) | 600 | "Select Mode" heading |
| Mode name | Body (1rem) | 600 | "Pregnancy Mode", "Wellness Mode", "Postpartum Mode" |
| Mode description | Caption (0.8125rem) | 400 | Brief description beneath each mode name |

### Spacing
| Token | Value | Usage |
|-------|-------|-------|
| Internal padding | 20dp | Sheet horizontal padding |
| Section spacing | 24dp | Between title and options list |
| Option vertical padding | 16dp | Vertical padding within each option row |
| Option gap | 12dp | Between icon and text in each option row |

### Elevation
- Sheet shadow: `0 -8px 32px rgba(139, 126, 216, 0.16)`
- Sheet border-radius: 28dp (top-left and top-right only)

### Animation
- Sheet entry: slide up from bottom with spring overshoot, 400ms
- Sheet exit: slide down, 180ms ease-out

## 8. Layout

### Container Structure (Bottom Sheet)
- **Drag handle**: Centered, 40px wide, 4px tall, `Chip Mist` color, 12dp top margin
- **Title area**: "Select Mode" in Subheading scale, centered, 24dp below drag handle
- **Content area**: Vertical list of mode options, 20dp horizontal padding
- **Max height**: 40% of screen height (three options fit comfortably)
- **Border-radius**: 28dp top-left and top-right
- **Background**: Cloud White, solid fill (no glass morphism)

## 9. Sections

### 9.1 Drag Handle
- Centered horizontal bar indicating the sheet is draggable
- Width: 40px, Height: 4px, border-radius: 9999px
- Color: Chip Mist

### 9.2 Title
- Text: "Select Mode"
- Style: Subheading scale, Ink Charcoal, weight 600
- Alignment: Center

### 9.3 Mode Options List
A `Column` of three tappable mode option rows:

#### Option: Pregnancy Mode
- **Icon**: `Icons.pregnant_woman` at 24px, Coral Bloom color
- **Label**: "Pregnancy Mode" — Body scale, weight 600, Ink Charcoal
- **Description**: "Track your pregnancy week by week" — Caption scale, Muted Quartz
- **Selected indicator**: Coral Whisper background tint on the row, trailing checkmark icon in Coral Bloom

#### Option: Wellness Mode
- **Icon**: `Icons.self_improvement` at 24px, Lilac Pulse color
- **Label**: "Wellness Mode" — Body scale, weight 600, Ink Charcoal
- **Description**: "General health and cycle tracking" — Caption scale, Muted Quartz
- **Selected indicator**: Lilac Whisper background tint on the row, trailing checkmark icon in Lilac Pulse

#### Option: Postpartum Mode
- **Icon**: `Icons.child_care` at 24px, Coral Bloom color
- **Label**: "Postpartum Mode" — Body scale, weight 600, Ink Charcoal
- **Description**: "Recovery and newborn care tracking" — Caption scale, Muted Quartz
- **Selected indicator**: Coral Whisper background tint on the row, trailing checkmark icon in Coral Bloom

### Option Row Layout
Each option row is a tappable container:
- **Padding**: 16dp vertical, 20dp horizontal
- **Border-radius**: 16dp (rounded corners for press state)
- **Layout**: `Row` — leading icon (24px) → 12dp gap → expanded `Column` (label + description) → trailing checkmark (if selected)
- **Press state**: Lilac Whisper background, gentle scale to 0.98
- **Minimum tap target**: 44px height

## 10. Data

### Entities
- **TrackingMode** (enum): `pregnancy`, `wellness`, `postpartum`
- Read from the current `PregnancyProfile` or app state

### Fields Displayed
- Current active mode (shown with selected indicator)
- Mode name and description for each option

## 11. Dismiss Behavior
- **Swipe down**: Dismiss sheet without changing mode
- **Tap outside** (on backdrop): Dismiss sheet without changing mode
- **Tap a mode option**: Apply the selected mode and dismiss the sheet

## 12. Return Value
Returns the selected `TrackingMode` value (or `null` if dismissed without selection). The parent screen uses this to update the app-wide mode state, which triggers:
- Background canvas gradient transition (400ms crossfade)
- Hero content update
- Mode selector pill label update

## 13. Accessibility
- **Semantics label** on sheet: "Mode selection bottom sheet"
- **Semantics label** on each option row: "Select [Mode Name]. [Description]"
- **Selected state**: `Semantics(selected: true)` on the currently active mode
- **Focus trapping**: Focus stays within the sheet while open; tab order cycles through the three options
- **Screen reader announcement**: When sheet opens, announce "Mode selection. Current mode: [active mode]"
- **Dismiss announcement**: On mode change, announce "Switched to [Mode Name]"
- **Drag handle**: `Semantics(label: 'Drag to dismiss')` or exclude from semantics (handle is decorative when swipe-to-dismiss is available)
