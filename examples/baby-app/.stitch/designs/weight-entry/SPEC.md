# Overlay Spec: Weight Entry

## 1. Overlay Title
Weight Entry

## 2. Overlay Type
**bottom-sheet**

## 3. Parent Screen
**weight-nutrition** (`lib/screens/weight_nutrition/weight_nutrition_screen.dart`)

## 4. Trigger
Tap the `FloatingActionButton` (coral circle with `+` icon) on the Weight & Nutrition screen (lines 68–83 in `weight_nutrition_screen.dart`). The FAB already calls `showModalBottomSheet()` with `isScrollControlled: true` and a `Placeholder()` widget as the builder content. The `05-mount` step should replace `const Placeholder()` with the `WeightEntry` overlay widget.

### Existing Placeholder Pattern
```dart
floatingActionButton: FloatingActionButton(
  onPressed: () {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (_) => const Placeholder(),
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
The `builder` callback should be replaced with `(_) => const WeightEntry()`.

## 5. Purpose
Allows the user to log a new weight measurement. This is the primary data-entry pathway for the weight tracking feature — users record their current weight (and optionally a date and note) which feeds into the weight chart, BMI gauge, and quick stats on the Weight & Nutrition screen. The overlay uses a bottom sheet because weight logging is a frequent, lightweight action that should not require full-screen navigation.

## 6. Widget Name
`WeightEntry`

## 7. Design Tokens

### Colors
| Token | Value | Usage |
|-------|-------|-------|
| Cloud White | `#FFFFFF` | Sheet background |
| Coral Bloom | `#F28B8B` | Save button fill, active input accent |
| Lilac Pulse | `#8B7ED8` | Input field focus border |
| Lilac Whisper | `rgba(139, 126, 216, 0.14)` | Input field focus ring |
| Soft Ivory | `#FDF9F8` | Input field background |
| Chip Mist | `rgba(139, 126, 216, 0.08)` | Drag handle color |
| Ghost Divide | `rgba(42, 42, 58, 0.06)` | Input field default border |
| Ink Charcoal | `#2A2A3A` | Primary text, input values |
| Muted Quartz | `#8B8B9C` | Labels, placeholder text, secondary text |
| Dim Veil | `rgba(42, 42, 58, 0.24)` | Backdrop overlay behind sheet |
| Fault Red | `#E85C5C` | Validation error border and message |

### Typography
| Role | Scale | Weight | Usage |
|------|-------|--------|-------|
| Sheet title | Subheading (1.125rem) | 600 | "Log Weight" heading |
| Input label | Caption (0.8125rem) | 500 | "Weight", "Date", "Notes" labels above fields |
| Input value | Stat (2.25rem) | 800 | Weight numeric display |
| Unit label | Data (0.875rem) | 500 | "kg" / "lbs" unit beside weight value |
| Button text | Body (1rem) | 600 | "Save" button label |
| Helper text | Caption (0.8125rem) | 400 | Date display, placeholder text |
| Error text | Data (0.875rem) | 500 | Validation error messages |

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
- **Title area**: "Log Weight" in Subheading scale, left-aligned, 24dp below drag handle
- **Content area**: Vertical column of input fields, 20dp horizontal padding
- **Action row**: Full-width "Save" pill button at bottom, 24dp above bottom safe area
- **Max height**: 60% of screen height (accommodates weight input, date picker, notes, and save button)
- **Border-radius**: 28dp top-left and top-right
- **Background**: Cloud White, solid fill (no glass morphism)
- **isScrollControlled**: true (allows the sheet to respect keyboard insets)

## 9. Sections

### 9.1 Drag Handle
- Centered horizontal bar indicating the sheet is draggable
- Width: 40px, Height: 4px, border-radius: 9999px
- Color: Chip Mist

### 9.2 Title
- Text: "Log Weight"
- Style: Subheading scale, Ink Charcoal, weight 600
- Alignment: Left

### 9.3 Weight Input
The primary input for the weight value.

- **Label**: "Weight" — Caption scale, Muted Quartz, weight 500, positioned above the input
- **Input field**: Soft Ivory background, 1px Ghost Divide border, 16dp border-radius
- **Input type**: Numeric keyboard (`TextInputType.numberWithOptions(decimal: true)`)
- **Value display**: Stat scale (2.25rem), weight 800, Ink Charcoal color — large numeric readout centered in the field
- **Unit toggle**: "kg" / "lbs" toggle positioned to the right of the input — Data scale, Muted Quartz. Tapping switches unit and converts the displayed value
- **Focus state**: Border transitions to Lilac Pulse, focus ring `0 0 0 3px rgba(139, 126, 216, 0.14)`
- **Error state**: Border transitions to Fault Red, error message below in Data scale ("Please enter a valid weight")
- **Minimum tap target**: 44px height

### 9.4 Date Selector
- **Label**: "Date" — Caption scale, Muted Quartz, weight 500
- **Display**: Tappable row showing the selected date in Caption scale, Ink Charcoal — defaults to today
- **Icon**: `Icons.calendar_today` at 20px, Muted Quartz, trailing
- **Tap behavior**: Opens a `showDatePicker` dialog constrained to past dates only
- **Border**: Soft Ivory background, 1px Ghost Divide border, 16dp border-radius
- **Minimum tap target**: 44px height

### 9.5 Notes Field (Optional)
- **Label**: "Notes (optional)" — Caption scale, Muted Quartz, weight 500
- **Input field**: Soft Ivory background, 1px Ghost Divide border, 16dp border-radius
- **Placeholder**: "Add a note..." in Muted Quartz at 70% opacity
- **Max lines**: 3 (multiline, but compact)
- **Input type**: Text
- **Focus state**: Same as weight input

### 9.6 Save Button
- **Style**: Primary coral pill button — Coral Bloom fill, Cloud White text
- **Text**: "Save" — Body scale, weight 600
- **Shape**: Fully rounded pill (border-radius 9999px)
- **Width**: Full-width within horizontal padding
- **Height**: 52dp
- **Disabled state**: 40% opacity when weight field is empty
- **Press state**: brightness 105%, `translateY(1px)`
- **Tap behavior**: Validates input, creates a `WeightEntry`, dismisses the sheet, and returns the entry to the parent

## 10. Data

### Entities
- **WeightEntry**
  - `id`: String (generated on save)
  - `date`: DateTime (selected date, defaults to today)
  - `value`: double (weight in the user's preferred unit)
  - `notes`: String? (optional note)

### Fields Displayed / Edited
- Weight value (required) — numeric input
- Date (required) — date picker, defaults to today
- Notes (optional) — free text

### Read from State
- User's preferred unit (kg/lbs) from `PregnancyProfile.units`

## 11. Dismiss Behavior
- **Swipe down**: Dismiss sheet without saving
- **Tap outside** (on backdrop): Dismiss sheet without saving
- **Tap "Save" button**: Validate input, save the entry, dismiss the sheet
- **Keyboard dismiss**: Tapping outside input fields dismisses the keyboard but does not dismiss the sheet

## 12. Return Value
Returns a `WeightEntry` object when saved, or `null` if dismissed without saving. The parent screen uses this to:
- Append the new entry to the weight history list
- Update the weight chart with the new data point
- Recalculate BMI if weight changed
- Update the quick stats row with the latest weight

## 13. Accessibility
- **Semantics label** on sheet: "Weight entry bottom sheet"
- **Semantics label** on weight input: "Enter weight in [kg/lbs]"
- **Semantics label** on date selector: "Select date. Currently [selected date]"
- **Semantics label** on notes field: "Optional notes"
- **Semantics label** on save button: "Save weight entry"
- **Focus trapping**: Focus stays within the sheet while open; tab order: weight input → date selector → notes field → save button
- **Screen reader announcement**: When sheet opens, announce "Log weight. Enter your weight measurement"
- **Keyboard support**: Return key in weight field moves focus to date selector; return in notes field triggers save
- **Drag handle**: `Semantics(label: 'Drag to dismiss')` or exclude from semantics
