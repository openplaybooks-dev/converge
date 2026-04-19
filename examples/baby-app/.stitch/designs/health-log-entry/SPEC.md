# Overlay Spec: Health Log Entry

## 1. Overlay Title
Health Log Entry

## 2. Overlay Type
**bottom-sheet**

## 3. Parent Screen
**health-log** (`lib/screens/health_log/health_log_screen.dart`)

## 4. Trigger
Tap the `FloatingActionButton` (coral circle with `+` icon) on the Health Log screen (lines 116–142 in `health_log_screen.dart`). The FAB currently uses a `SnackBar` stub as its placeholder action:

### Existing Placeholder Pattern
```dart
floatingActionButton: FloatingActionButton(
  onPressed: () {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Add new health log entry')),
    );
  },
  backgroundColor: AppTheme.coralColor,
  elevation: 0,
  shape: const CircleBorder(),
  child: Icon(
    Icons.add,
    color: colorScheme.surface,
    size: 22,
  ),
),
```
The `onPressed` callback should be replaced with a `showModalBottomSheet()` call presenting the `HealthLogEntry` overlay widget.

## 5. Purpose
Allows the user to create a new health log entry — either a doctor visit note, a symptom record, or a checkup reminder. This overlay serves as the unified entry point for all three health-log data types, presenting a type selector first and then contextual fields based on the chosen type. A bottom sheet is appropriate because logging a health entry is a frequent, moderate-complexity action that benefits from staying in context of the Health Log screen.

## 6. Widget Name
`HealthLogEntry`

## 7. Design Tokens

### Colors
| Token | Value | Usage |
|-------|-------|-------|
| Cloud White | `#FFFFFF` | Sheet background |
| Coral Bloom | `#F28B8B` | Save button fill, active type-selector chip |
| Coral Whisper | `rgba(242, 139, 139, 0.12)` | Active type-selector chip background |
| Lilac Pulse | `#8B7ED8` | Input field focus border |
| Lilac Whisper | `rgba(139, 126, 216, 0.14)` | Input field focus ring |
| Soft Ivory | `#FDF9F8` | Input field background |
| Chip Mist | `rgba(139, 126, 216, 0.08)` | Drag handle color, inactive type-selector chips |
| Ghost Divide | `rgba(42, 42, 58, 0.06)` | Input field default border |
| Ink Charcoal | `#2A2A3A` | Primary text, input values |
| Muted Quartz | `#8B8B9C` | Labels, placeholder text, secondary text |
| Dim Veil | `rgba(42, 42, 58, 0.24)` | Backdrop overlay behind sheet |
| Fault Red | `#E85C5C` | Validation error border and message |

### Typography
| Role | Scale | Weight | Usage |
|------|-------|--------|-------|
| Sheet title | Subheading (1.125rem) | 600 | "New Entry" heading |
| Type label | Caption (0.8125rem) | 600 | Type-selector chip labels |
| Input label | Caption (0.8125rem) | 500 | Field labels above inputs |
| Input value | Body (1rem) | 400 | User-entered text values |
| Button text | Body (1rem) | 600 | "Save" button label |
| Helper text | Caption (0.8125rem) | 400 | Date display, placeholder text |
| Error text | Data (0.875rem) | 500 | Validation error messages |

### Spacing
| Token | Value | Usage |
|-------|-------|-------|
| Internal padding | 20dp | Sheet horizontal padding |
| Section spacing | 24dp | Between title, type selector, fields, and action row |
| Input vertical gap | 16dp | Between input fields |
| Label-to-field gap | 8dp | Between label text and input field |
| Chip gap | 8dp | Between type-selector chips |

### Elevation
- Sheet shadow: `0 -8px 32px rgba(139, 126, 216, 0.16)`
- Sheet border-radius: 28dp (top-left and top-right only)

### Animation
- Sheet entry: slide up from bottom with spring overshoot, 400ms
- Sheet exit: slide down, 180ms ease-out

## 8. Layout

### Container Structure (Bottom Sheet)
- **Drag handle**: Centered, 40px wide, 4px tall, `Chip Mist` color, 12dp top margin
- **Title area**: "New Entry" in Subheading scale, left-aligned, 24dp below drag handle
- **Type selector row**: Horizontal row of 3 pill chips (Visit / Symptom / Reminder), 24dp below title
- **Content area**: Vertical column of input fields that change based on selected type, 20dp horizontal padding
- **Action row**: Full-width "Save" pill button at bottom, 24dp above bottom safe area
- **Max height**: 70% of screen height (accommodates type selector, multiple fields, and save button)
- **Border-radius**: 28dp top-left and top-right
- **Background**: Cloud White, solid fill
- **isScrollControlled**: true (allows the sheet to respect keyboard insets)

## 9. Sections

### 9.1 Drag Handle
- Centered horizontal bar indicating the sheet is draggable
- Width: 40px, Height: 4px, border-radius: 9999px
- Color: Chip Mist

### 9.2 Title
- Text: "New Entry"
- Style: Subheading scale, Ink Charcoal, weight 600
- Alignment: Left

### 9.3 Entry Type Selector
A row of three pill-shaped chips for selecting the entry type. Only one can be active at a time.

- **Chips**: "Visit", "Symptom", "Reminder"
- **Inactive style**: Chip Mist background, Muted Quartz text, Caption scale weight 600, pill shape (9999px)
- **Active style**: Coral Whisper background, Coral Bloom text, Caption scale weight 600, pill shape (9999px)
- **Layout**: Horizontal `Row` with `Wrap` fallback, 8dp gap between chips
- **Minimum tap target**: 44px height
- **Default selection**: "Visit" pre-selected

### 9.4 Doctor Visit Fields (shown when type = Visit)

**Date Selector**
- **Label**: "Date" — Caption scale, Muted Quartz, weight 500
- **Display**: Tappable row showing the selected date in Caption scale, Ink Charcoal — defaults to today
- **Icon**: `Icons.calendar_today` at 20px, Muted Quartz, trailing
- **Tap behavior**: Opens a `showDatePicker` dialog
- **Border**: Soft Ivory background, 1px Ghost Divide border, 16dp border-radius
- **Minimum tap target**: 44px height

**Doctor Name Field (Optional)**
- **Label**: "Doctor Name (optional)" — Caption scale, Muted Quartz, weight 500
- **Input field**: Soft Ivory background, 1px Ghost Divide border, 16dp border-radius
- **Placeholder**: "Dr. ..." in Muted Quartz at 70% opacity
- **Input type**: Text
- **Focus state**: Border transitions to Lilac Pulse, focus ring

**Summary Field**
- **Label**: "Summary" — Caption scale, Muted Quartz, weight 500
- **Input field**: Soft Ivory background, 1px Ghost Divide border, 16dp border-radius
- **Placeholder**: "Brief description of the visit..." in Muted Quartz at 70% opacity
- **Max lines**: 2
- **Input type**: Text
- **Required**: Yes — validation error if empty on save

**Notes Field (Optional)**
- **Label**: "Notes (optional)" — Caption scale, Muted Quartz, weight 500
- **Input field**: Soft Ivory background, 1px Ghost Divide border, 16dp border-radius
- **Placeholder**: "Additional details..." in Muted Quartz at 70% opacity
- **Max lines**: 3
- **Input type**: Text

### 9.5 Symptom Fields (shown when type = Symptom)

**Date Selector**
- Same as Visit date selector (section 9.4)

**Symptom Type Selector**
- **Label**: "Type" — Caption scale, Muted Quartz, weight 500
- **Widget**: Horizontal `Wrap` of selectable chips for common symptom types (Nausea, Headache, Fatigue, Back Pain, Cramps, Swelling)
- **Inactive style**: Chip Mist background, Muted Quartz text
- **Active style**: Coral Whisper background, Coral Bloom text
- **Required**: Yes

**Severity Selector**
- **Label**: "Severity" — Caption scale, Muted Quartz, weight 500
- **Widget**: Row of 3 selectable pills: "Mild", "Moderate", "Severe"
- **Colors**: Mild = Chip Mist/Muted Quartz, Moderate = Caution Amber tint, Severe = Fault Red tint
- **Required**: Yes — defaults to "Mild"

**Notes Field (Optional)**
- Same as Visit notes field (section 9.4)

### 9.6 Reminder Fields (shown when type = Reminder)

**Date Selector**
- Same as Visit date selector, but allows future dates

**Title Field**
- **Label**: "Reminder" — Caption scale, Muted Quartz, weight 500
- **Input field**: Soft Ivory background, 1px Ghost Divide border, 16dp border-radius
- **Placeholder**: "e.g. Glucose screening appointment" in Muted Quartz at 70% opacity
- **Input type**: Text
- **Required**: Yes — validation error if empty on save

### 9.7 Save Button
- **Style**: Primary coral pill button — Coral Bloom fill, Cloud White text
- **Text**: "Save" — Body scale, weight 600
- **Shape**: Fully rounded pill (border-radius 9999px)
- **Width**: Full-width within horizontal padding
- **Height**: 52dp
- **Disabled state**: 40% opacity when required fields are empty
- **Press state**: brightness 105%, `translateY(1px)`
- **Tap behavior**: Validates required fields, creates the appropriate entity, dismisses the sheet, and returns the entry to the parent

## 10. Data

### Entities
- **DoctorVisit**
  - `id`: String (generated on save)
  - `date`: DateTime (selected date, defaults to today)
  - `doctorName`: String? (optional)
  - `summary`: String (required)
  - `notes`: String? (optional)

- **SymptomEntry**
  - `id`: String (generated on save)
  - `date`: DateTime (selected date, defaults to today)
  - `type`: SymptomType (required — enum: nausea, headache, fatigue, backPain, cramps, swelling)
  - `severity`: int (1–3, required, defaults to 1)
  - `notes`: String? (optional)

- **Reminder**
  - `id`: String (generated on save)
  - `date`: DateTime (selected date)
  - `title`: String (required)
  - `isDone`: bool (defaults to false)

### Fields Displayed / Edited
- Entry type selection (required) — chip selector
- Date (required) — date picker, defaults to today
- Type-specific fields as defined in sections 9.4–9.6

## 11. Dismiss Behavior
- **Swipe down**: Dismiss sheet without saving
- **Tap outside** (on backdrop): Dismiss sheet without saving
- **Tap "Save" button**: Validate required fields, save the entry, dismiss the sheet
- **Keyboard dismiss**: Tapping outside input fields dismisses the keyboard but does not dismiss the sheet

## 12. Return Value
Returns a `DoctorVisit`, `SymptomEntry`, or `Reminder` object (depending on selected type) when saved, or `null` if dismissed without saving. The parent screen uses this to:
- Append the new entry to the corresponding tab list (Doctor Visits, Symptoms, or Reminders)
- Switch to the relevant tab to show the newly added entry

## 13. Accessibility
- **Semantics label** on sheet: "Health log entry bottom sheet"
- **Semantics label** on type selector: "Entry type. [Visit/Symptom/Reminder] selected"
- **Semantics label** on date selector: "Select date. Currently [selected date]"
- **Semantics label** on each input field: Matches the field label text
- **Semantics label** on save button: "Save health log entry"
- **Focus trapping**: Focus stays within the sheet while open; tab order follows visual layout top-to-bottom
- **Screen reader announcement**: When sheet opens, announce "New health log entry. Select entry type and fill in details"
- **Chip selection**: Announce "Selected [type]" when switching entry type
- **Drag handle**: `Semantics(label: 'Drag to dismiss')` or exclude from semantics
