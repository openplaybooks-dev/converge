# Overlay Spec: Due Date Picker

## 1. Overlay Title
Due Date Picker

## 2. Overlay Type
**dialog**

## 3. Parent Screen
**settings** (`lib/screens/settings/settings_screen.dart`)

The trigger lives in the `PregnancySection` widget (`lib/screens/settings/widgets/pregnancy_section.dart`).

## 4. Trigger
Tap the "Due Date" row in the Pregnancy section of the Settings screen (line 43–79 in `pregnancy_section.dart`). The row displays "Due Date" on the left with the current date ("15 Aug 2026") and a chevron-right icon on the right. The existing implementation uses a `debugPrint` stub as the `onTap` handler:

### Existing Placeholder Pattern
```dart
InkWell(
  onTap: () => debugPrint('Edit due date'),
  borderRadius: BorderRadius.circular(AppTheme.radiusSm),
  child: Padding(
    padding: const EdgeInsets.symmetric(vertical: 12),
    child: Row(
      // ... Due Date label + date value + chevron
    ),
  ),
),
```
The `onTap` callback should be replaced with a call to `showDialog()` presenting the `DueDatePicker` widget.

## 5. Purpose
Allows the user to set or update their estimated due date (EDD). The due date is the anchor for all pregnancy week calculations, trimester display, baby size comparisons, and the due date countdown. This overlay uses a dialog rather than a bottom sheet because date selection is a focused, confirmable action that benefits from a centered modal with explicit confirm/cancel actions.

## 6. Widget Name
`DueDatePicker`

## 7. Design Tokens

### Colors
| Token | Value | Usage |
|-------|-------|-------|
| Cloud White | `#FFFFFF` | Dialog background |
| Coral Bloom | `#F28B8B` | Confirm button fill, selected date highlight |
| Coral Whisper | `rgba(242, 139, 139, 0.12)` | Today highlight, selected date ring |
| Lilac Pulse | `#8B7ED8` | Month/year navigation arrows |
| Ink Charcoal | `#2A2A3A` | Day numbers, title text |
| Muted Quartz | `#8B8B9C` | Weekday headers, unselectable dates |
| Dim Veil | `rgba(42, 42, 58, 0.24)` | Backdrop overlay behind dialog |
| Fault Red | `#E85C5C` | Validation error text (if date is out of range) |
| Ghost Divide | `rgba(42, 42, 58, 0.06)` | Divider between calendar and action row |

### Typography
| Role | Scale | Weight | Usage |
|------|-------|--------|-------|
| Dialog title | Subheading (1.125rem) | 600 | "Set Due Date" heading |
| Month/year label | Body (1rem) | 600 | "August 2026" navigation header |
| Weekday headers | Micro (0.6875rem) | 700 | "SUN", "MON", etc. |
| Day numbers | Data (0.875rem) | 500 | Calendar day cells |
| Selected day | Data (0.875rem) | 700 | Highlighted selected date |
| Button text | Body (1rem) | 600 | "Cancel", "Confirm" |

### Spacing
| Token | Value | Usage |
|-------|-------|-------|
| Dialog padding | 24dp | Internal padding all sides |
| Title bottom margin | 20dp | Below dialog title |
| Calendar grid gap | 8dp | Between day cells |
| Action row top padding | 16dp | Above confirm/cancel buttons |
| Button gap | 12dp | Between Cancel and Confirm buttons |

### Elevation
- Dialog shadow: `0 8px 32px rgba(139, 126, 216, 0.14)` (Prominent tier)
- Dialog border-radius: 24dp

### Animation
- Dialog entry: scale from 0.95 to 1.0 with opacity fade, 250ms spring
- Dialog exit: fade out, 180ms ease-out

## 8. Layout

### Container Structure (Dialog)
- **Title bar**: "Set Due Date" in Subheading scale, left-aligned, 24dp padding
- **Content area**: Month navigation row + 7-column calendar grid
- **Divider**: 1px Ghost Divide line between content and action row
- **Action row**: Right-aligned row with "Cancel" (ghost button) and "Confirm" (coral pill button)
- **Max width**: 360dp (centered horizontally on screen)
- **Border-radius**: 24dp all corners
- **Background**: Cloud White, solid fill

## 9. Sections

### 9.1 Title
- Text: "Set Due Date"
- Style: Subheading scale, Ink Charcoal, weight 600
- Alignment: Left

### 9.2 Month Navigation Row
A horizontal row for navigating between months:
- **Left arrow**: `Icons.chevron_left` at 22px, Lilac Pulse color, 44px tap target
- **Month/year label**: "August 2026" — Body scale, weight 600, Ink Charcoal, centered
- **Right arrow**: `Icons.chevron_right` at 22px, Lilac Pulse color, 44px tap target
- Layout: `Row` with `MainAxisAlignment.spaceBetween`

### 9.3 Weekday Header Row
- Seven abbreviated day labels: "SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"
- Style: Micro scale, Muted Quartz, weight 700, uppercase
- Layout: 7-column grid, evenly spaced, 8dp below month nav

### 9.4 Calendar Day Grid
A 7-column grid of day cells (typically 5-6 rows):
- **Normal day**: Data scale, Ink Charcoal, weight 500, 40px diameter circular tap target
- **Selected day**: Coral Bloom background circle, Cloud White text, weight 700
- **Today (unselected)**: Coral Whisper background circle, Coral Bloom text
- **Out-of-range days**: Muted Quartz text at 40% opacity, non-tappable
- **Empty cells**: Days outside the current month render as empty space
- **Press state**: Coral Whisper background circle on press
- Minimum tap target: 44px per cell (achieved via padding around the 40px circle)

### 9.5 Action Row
Right-aligned row of two buttons:
- **Cancel**: Ghost button — transparent fill, 1.5px Ghost Divide border, Ink Charcoal text, pill shape (border-radius 9999px)
- **Confirm**: Primary button — Coral Bloom fill, Cloud White text, pill shape (border-radius 9999px)
- Button height: 44px
- Gap between buttons: 12dp

## 10. Data

### Entities
- **PregnancyProfile.dueDate** (`DateTime`): The current due date stored in the profile
- **PregnancyProfile.lastMenstrualPeriod** (`DateTime`): Optional — can be used to calculate due date (LMP + 280 days)

### Fields Displayed
- Currently selected date (highlighted in calendar)
- Current month and year (navigation header)

### Validation
- Due date must be in the future (after today)
- Due date should be within a reasonable pregnancy range (no more than ~42 weeks from today)

## 11. Dismiss Behavior
- **Tap "Cancel"**: Dismiss dialog without changing the due date
- **Tap outside** (on backdrop): Dismiss dialog without changing the due date
- **Tap "Confirm"**: Apply the selected date and dismiss the dialog
- **Back button / swipe back**: Dismiss without changing

## 12. Return Value
Returns the selected `DateTime` value (or `null` if dismissed via Cancel, backdrop tap, or back button). The parent screen uses this to:
- Update `PregnancyProfile.dueDate`
- Recalculate `currentWeek` and `currentTrimester`
- Refresh the due date display in the Pregnancy section row
- Propagate changes to home screen hero, progress screen, and due date countdown

## 13. Accessibility
- **Semantics label** on dialog: "Due date picker dialog"
- **Semantics label** on month navigation: "Navigate months. Currently showing [Month Year]"
- **Semantics label** on each day cell: "[Day number] [Month] [Year]" (e.g., "15 August 2026")
- **Selected state**: `Semantics(selected: true)` on the currently selected date
- **Disabled state**: `Semantics(enabled: false)` on out-of-range dates
- **Focus trapping**: Focus stays within the dialog while open; tab order: month arrows, day grid, Cancel, Confirm
- **Screen reader announcement**: When dialog opens, announce "Set due date. Currently selected: [date]"
- **Confirm announcement**: On date change, announce "Due date set to [date]"
- **Cancel button**: `Semantics(label: 'Cancel and keep current due date')`
- **Confirm button**: `Semantics(label: 'Confirm selected due date')`
