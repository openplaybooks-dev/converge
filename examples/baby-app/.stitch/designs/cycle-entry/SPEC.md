# Overlay Spec: Cycle Entry

## 1. Overlay Title
Cycle Entry

## 2. Overlay Type
**bottom-sheet**

## 3. Parent Screen
**cycle-tracking** (`lib/screens/cycle_tracking/cycle_tracking_screen.dart`)

## 4. Trigger
Tap the `FloatingActionButton` (coral circle with `+` icon) on the Cycle Tracking screen (lines 65–78 in `cycle_tracking_screen.dart`). The FAB currently shows a `SnackBar` with text "Log new cycle start" as a placeholder stub. The `05-mount` step should replace the `SnackBar` stub with a `showModalBottomSheet()` call that presents the `CycleEntry` overlay widget.

A secondary trigger exists: tapping a calendar day in the `CalendarCard` should also open this overlay, pre-populated with the tapped date as the start date.

### Existing Placeholder Pattern
```dart
floatingActionButton: FloatingActionButton(
  onPressed: () {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Log new cycle start')),
    );
  },
  backgroundColor: AppTheme.coralColor,
  shape: const CircleBorder(),
  child: const Icon(
    Icons.add,
    color: AppTheme.surfaceColor,
    size: 22,
  ),
),
```
The `onPressed` callback should be replaced with a `showModalBottomSheet()` call that presents `const CycleEntry()`.

## 5. Purpose
Allows the user to log a new menstrual cycle entry or edit an existing one. This is the primary data-entry pathway for cycle tracking — users record their cycle start date, optional end date, irregularity flag, and notes. The logged entry feeds into the calendar view (color-coded cycle days), current cycle summary card, ovulation/fertile window calculations, and cycle history list. A bottom sheet is used because cycle logging is a frequent, lightweight action that should not require full-screen navigation.

## 6. Widget Name
`CycleEntry`

## 7. Design Tokens

### Colors
| Token | Value | Usage |
|-------|-------|-------|
| Cloud White | `#FFFFFF` | Sheet background |
| Coral Bloom | `#F28B8B` | Save button fill, active date accent |
| Lilac Pulse | `#8B7ED8` | Input field focus border, toggle active state |
| Lilac Whisper | `rgba(139, 126, 216, 0.14)` | Input field focus ring |
| Soft Ivory | `#FDF9F8` | Input field background |
| Chip Mist | `rgba(139, 126, 216, 0.08)` | Drag handle color, irregular chip inactive background |
| Ghost Divide | `rgba(42, 42, 58, 0.06)` | Input field default border |
| Ink Charcoal | `#2A2A3A` | Primary text, input values |
| Muted Quartz | `#8B8B9C` | Labels, placeholder text, secondary text |
| Dim Veil | `rgba(42, 42, 58, 0.24)` | Backdrop overlay behind sheet |
| Fault Red | `#E85C5C` | Validation error border and message |
| Caution Amber | `#F4C84D` | Irregular cycle indicator |

### Typography
| Role | Scale | Weight | Usage |
|------|-------|--------|-------|
| Sheet title | Subheading (1.125rem) | 600 | "Log Cycle" heading |
| Input label | Caption (0.8125rem) | 500 | "Start Date", "End Date", "Notes" labels above fields |
| Date display | Body (1rem) | 500 | Selected date text inside date fields |
| Button text | Body (1rem) | 600 | "Save" button label |
| Helper text | Caption (0.8125rem) | 400 | Placeholder text, hint text |
| Error text | Data (0.875rem) | 500 | Validation error messages |
| Toggle label | Data (0.875rem) | 500 | "Mark as irregular" label |

### Spacing
| Token | Value | Usage |
|-------|-------|-------|
| Internal padding | 20dp | Sheet horizontal padding |
| Section spacing | 24dp | Between title, input areas, and action row |
| Input vertical gap | 16dp | Between input fields |
| Label-to-field gap | 8dp | Between label text and input field |

### Elevation
- Sheet shadow: `0 -8px 32px rgba(139, 126, 216, 0.16)`
- Sheet border-radius: 28dp (top-left and top-right only)

### Animation
- Sheet entry: slide up from bottom with spring overshoot, 400ms
- Sheet exit: slide down, 180ms ease-out

## 8. Layout

### Container Structure (Bottom Sheet)
- **Drag handle**: Centered, 40px wide, 4px tall, `Chip Mist` color, 12dp top margin
- **Title area**: "Log Cycle" in Subheading scale, left-aligned, 24dp below drag handle
- **Content area**: Vertical column of input fields, 20dp horizontal padding
- **Action row**: Full-width "Save" pill button at bottom, 24dp above bottom safe area
- **Max height**: 55% of screen height (accommodates start date, end date, irregular toggle, notes, and save button)
- **Border-radius**: 28dp top-left and top-right
- **Background**: Cloud White, solid fill (no glass morphism)
- **isScrollControlled**: true (allows the sheet to respect keyboard insets)

## 9. Sections

### 9.1 Drag Handle
- Centered horizontal bar indicating the sheet is draggable
- Width: 40px, Height: 4px, border-radius: 9999px
- Color: Chip Mist

### 9.2 Title
- Text: "Log Cycle"
- Style: Subheading scale, Ink Charcoal, weight 600
- Alignment: Left

### 9.3 Start Date Selector
- **Label**: "Start Date" — Caption scale, Muted Quartz, weight 500
- **Display**: Tappable row showing the selected date in Body scale, Ink Charcoal — defaults to today
- **Icon**: `Icons.calendar_today` at 20px, Muted Quartz, trailing
- **Tap behavior**: Opens a `showDatePicker` dialog constrained to past dates and today
- **Border**: Soft Ivory background, 1px Ghost Divide border, 16dp border-radius
- **Minimum tap target**: 44px height
- **Required**: Yes — cannot save without a start date

### 9.4 End Date Selector (Optional)
- **Label**: "End Date (optional)" — Caption scale, Muted Quartz, weight 500
- **Display**: Tappable row showing the selected date in Body scale, Ink Charcoal — or placeholder "Select end date" in Muted Quartz at 70% opacity
- **Icon**: `Icons.calendar_today` at 20px, Muted Quartz, trailing
- **Tap behavior**: Opens a `showDatePicker` dialog constrained to dates on or after the start date
- **Border**: Soft Ivory background, 1px Ghost Divide border, 16dp border-radius
- **Minimum tap target**: 44px height
- **Validation**: End date must be on or after start date; if invalid, show error in Data scale, Fault Red

### 9.5 Irregular Cycle Toggle
- **Layout**: Row with label on the left and toggle switch on the right
- **Label**: "Mark as irregular" — Data scale, Ink Charcoal, weight 500
- **Toggle**: Standard toggle switch (52px wide, 30px tall). Inactive: Chip Mist track. Active: Lilac Pulse track
- **Default**: Off (not irregular)
- **Purpose**: Flags this cycle as irregular for pattern tracking and display in the Irregular Cycle Notes card

### 9.6 Notes Field (Optional)
- **Label**: "Notes (optional)" — Caption scale, Muted Quartz, weight 500
- **Input field**: Soft Ivory background, 1px Ghost Divide border, 16dp border-radius
- **Placeholder**: "Add a note..." in Muted Quartz at 70% opacity
- **Max lines**: 3 (multiline, but compact)
- **Input type**: Text
- **Focus state**: Border transitions to Lilac Pulse, focus ring `0 0 0 3px rgba(139, 126, 216, 0.14)`

### 9.7 Save Button
- **Style**: Primary coral pill button — Coral Bloom fill, Cloud White text
- **Text**: "Save" — Body scale, weight 600
- **Shape**: Fully rounded pill (border-radius 9999px)
- **Width**: Full-width within horizontal padding
- **Height**: 52dp
- **Disabled state**: 40% opacity when start date is not selected
- **Press state**: brightness 105%, `translateY(1px)`
- **Tap behavior**: Validates input, creates a `CycleEntry`, dismisses the sheet, and returns the entry to the parent

## 10. Data

### Entities
- **CycleEntry**
  - `id`: String (generated on save)
  - `startDate`: DateTime (selected start date, defaults to today)
  - `endDate`: DateTime? (optional end date)
  - `isIrregular`: bool (irregular cycle flag, defaults to false)
  - `notes`: String? (optional note)

### Fields Displayed / Edited
- Start date (required) — date picker, defaults to today
- End date (optional) — date picker
- Irregular flag (optional) — toggle switch, defaults to false
- Notes (optional) — free text

### Read from State
- Existing cycle entries from `cycleEntriesProvider` for validation (prevent overlapping cycles)

## 11. Dismiss Behavior
- **Swipe down**: Dismiss sheet without saving
- **Tap outside** (on backdrop): Dismiss sheet without saving
- **Tap "Save" button**: Validate input, save the entry, dismiss the sheet
- **Keyboard dismiss**: Tapping outside input fields dismisses the keyboard but does not dismiss the sheet

## 12. Return Value
Returns a `CycleEntry` object when saved, or `null` if dismissed without saving. The parent screen uses this to:
- Add the new cycle to the calendar view with color-coded days
- Update the current cycle summary card with new cycle data
- Recalculate ovulation predictions and fertile window estimates
- Append the entry to the cycle history list
- Update the irregular cycle notes card if flagged as irregular

## 13. Accessibility
- **Semantics label** on sheet: "Cycle entry bottom sheet"
- **Semantics label** on start date selector: "Select cycle start date. Currently [selected date]"
- **Semantics label** on end date selector: "Select cycle end date. Currently [selected date or not set]"
- **Semantics label** on irregular toggle: "Mark cycle as irregular. Currently [on/off]"
- **Semantics label** on notes field: "Optional notes"
- **Semantics label** on save button: "Save cycle entry"
- **Focus trapping**: Focus stays within the sheet while open; tab order: start date → end date → irregular toggle → notes field → save button
- **Screen reader announcement**: When sheet opens, announce "Log cycle. Enter your cycle information"
- **Drag handle**: `Semantics(label: 'Drag to dismiss')` or exclude from semantics
