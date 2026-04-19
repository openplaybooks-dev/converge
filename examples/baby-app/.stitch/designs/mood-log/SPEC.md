# Overlay Specification: Mood Logging

## 1. Overlay Title
Mood Logging

## 2. Overlay Type
**bottom-sheet**

## 3. Parent Screen
**mood-wellness** (`/mood` — `MoodWellnessScreen`)

## 4. Trigger
Tap the FloatingActionButton (coral circle with `+` icon) on the Mood & Wellness screen. The FAB calls `showModalBottomSheet()` and currently renders a `Placeholder()` widget as the builder content.

**Existing placeholder location:** `lib/screens/mood_wellness/mood_wellness_screen.dart`, lines 197–201:
```dart
onPressed: () {
  showModalBottomSheet(
    context: context,
    builder: (_) => const Placeholder(),
  );
},
```
The `05-mount` step should replace `const Placeholder()` with the `MoodLog` widget.

## 5. Purpose
Allows the user to quickly log their current mood level, energy level, and an optional text note. This is the primary data-entry point for mood tracking — the FAB is the most prominent call-to-action on the Mood & Wellness screen. Logged entries appear in the mood history list, feed the mood trends chart, and inform wellness recommendations.

## 6. Widget Name
`MoodLog`

## 7. Design Tokens

### Colors
- **Sheet background:** Cloud White (#FFFFFF)
- **Drag handle:** Chip Mist (rgba(139, 126, 216, 0.08))
- **Primary accent (selected mood, confirm button):** Coral Bloom (#F28B8B)
- **Selected highlight tint:** Coral Whisper (rgba(242, 139, 139, 0.12))
- **Secondary accent (energy slider active):** Lilac Pulse (#8B7ED8)
- **Text primary:** Ink Charcoal (#2A2A3A)
- **Text secondary:** Muted Quartz (#8B8B9C)
- **Divider:** Ghost Divide (rgba(42, 42, 58, 0.06))
- **Input background:** Soft Ivory (#FDF9F8)
- **Input border:** Ghost Divide; focus border: Lilac Pulse
- **Backdrop:** Dim Veil (rgba(42, 42, 58, 0.24))

### Typography
- **Sheet title:** Heading — 1.5rem / 700 weight, Ink Charcoal
- **Section labels:** Subheading — 1.125rem / 600 weight, Ink Charcoal
- **Mood option labels:** Data — 0.875rem / 500 weight, Muted Quartz (unselected), Coral Bloom (selected)
- **Energy value label:** Stat — 2.25rem / 800 weight, Lilac Pulse
- **Note placeholder:** Body — 1rem / 400 weight, Muted Quartz at 70% opacity
- **Button text:** Subheading — 1.125rem / 600 weight, Cloud White

### Spacing
- **Sheet internal padding:** 20dp (1.25rem) horizontal, 24dp top below drag handle
- **Section gap:** 24dp between sections
- **Mood option gap:** 12dp between mood circles
- **Bottom padding:** 20dp + safe area inset

### Corner Radius
- **Sheet top corners:** 28px (1.75rem)
- **Confirm button:** 9999px (pill)
- **Note input field:** 8dp
- **Mood option circles:** 9999px (circle)

### Elevation
- **Sheet shadow:** `0 -8px 32px rgba(139, 126, 216, 0.16)`

### Animation
- **Sheet entry:** Slide up from bottom with spring overshoot, 400ms
- **Mood option selection:** Scale spring from 1.0 to 1.1 to 1.0, 250ms
- **Confirm button:** Standard spring curve

## 8. Layout

### Container Structure (Bottom Sheet)
- **Drag handle:** 40px wide, 4px tall, centered, Chip Mist color, 12dp top margin
- **Max height:** 85% of screen height
- **Top corner radius:** 1.75rem (28px)
- **Background:** Cloud White, solid fill, no glass morphism
- **Content area:** Vertically scrollable `SingleChildScrollView` if content exceeds available height
- **Action button:** Fixed at bottom of sheet content (not floating), full-width pill button with 20dp horizontal padding

### Vertical Layout Order
1. Drag handle (centered)
2. Sheet title — "Log Your Mood"
3. Mood selector section
4. Energy level section
5. Notes input section
6. Confirm button — "Save Entry"

## 9. Sections

### 9.1 Mood Selector
- **Description:** A row of 5 mood-level options representing mood from 1 (lowest) to 5 (highest)
- **Widget type:** `Row` with `MainAxisAlignment.spaceEvenly`
- **Interactive elements:** 5 tappable mood option widgets, each containing:
  - A circular container (48dp diameter) with an icon or illustration representing the mood level
  - A label beneath: "Awful", "Bad", "Okay", "Good", "Great"
  - Unselected state: Chip Mist background, Muted Quartz icon/label
  - Selected state: Coral Whisper background with Coral Bloom border (2px), Coral Bloom icon/label, scale spring animation
- **Single selection** — tapping one deselects the previously selected option

### 9.2 Energy Level
- **Description:** A slider to rate current energy level from 1 to 5
- **Widget type:** `Column` with label, value display, and `Slider`
- **Interactive elements:**
  - Section label: "Energy Level" (Subheading)
  - Current value: large numeric display (Stat scale) in Lilac Pulse
  - A continuous `Slider` from 1 to 5 (stepped), active track in Lilac Pulse, inactive track in Chip Mist, thumb in Cloud White with standard shadow
- **Minimum tap target:** 44px on slider thumb

### 9.3 Notes Input
- **Description:** Optional free-text field for the user to add context to their mood entry
- **Widget type:** `TextField` (multiline, max 3 lines visible)
- **Interactive elements:**
  - Label above: "Add a note (optional)" (Caption scale, Muted Quartz)
  - Soft Ivory background, Ghost Divide border, 1rem border-radius
  - Placeholder text: "How are you feeling today?" in Muted Quartz at 70% opacity
  - Focus state: Lilac Pulse border with focus ring

### 9.4 Confirm Button
- **Description:** Primary action to save the mood entry
- **Widget type:** `ElevatedButton` (full-width pill)
- **Interactive elements:**
  - Label: "Save Entry"
  - Coral Bloom (#F28B8B) fill, Cloud White text
  - Pill shape (border-radius 9999px)
  - Disabled state (40% opacity) when no mood level is selected
  - On tap: validates that mood is selected, saves entry, dismisses sheet

## 10. Data

### Entities
- **MoodEntry** (from data model):
  - `id`: String (generated on save)
  - `date`: DateTime (current date/time)
  - `moodLevel`: int (1–5, required)
  - `energyLevel`: int (1–5, default 3)
  - `notes`: String? (optional)

### Fields Displayed/Edited
- Mood level — selected via mood option circles (required)
- Energy level — adjusted via slider (defaults to 3)
- Notes — typed into text field (optional)

## 11. Dismiss Behavior

- **Swipe down** on drag handle or sheet body — dismisses without saving
- **Tap outside** (on backdrop) — dismisses without saving
- **Tap "Save Entry"** — saves the mood entry and dismisses the sheet
- **Back gesture / hardware back button** — dismisses without saving
- No confirmation dialog on dismiss-without-save (data loss is minimal — only unsaved form input)

## 12. Return Value

The overlay passes the created `MoodEntry` back to the parent screen when the user taps "Save Entry". The parent can use this to:
- Prepend the new entry to the mood history list
- Refresh the mood trends chart
- Update the "Today's Mood Card" to reflect the newly logged mood

When dismissed without saving, returns `null`.

## 13. Accessibility

- **Semantics labels:**
  - Sheet: `Semantics(label: 'Mood logging sheet')`
  - Each mood option: `Semantics(label: '{mood name}, mood level {n} of 5', selected: true/false)`
  - Energy slider: `Semantics(label: 'Energy level', value: '{n} of 5')`
  - Notes field: `Semantics(label: 'Optional mood note')`
  - Save button: `Semantics(label: 'Save mood entry', button: true)`
- **Focus trapping:** Focus stays within the bottom sheet while it is open. Initial focus on the first mood option
- **Screen reader announcements:** Announce "Mood logging sheet opened" on present, "Mood entry saved" on successful save, "Mood logging sheet closed" on dismiss
- **Touch targets:** All mood option circles are minimum 48dp (exceeds 44dp minimum). Slider thumb respects 44dp minimum
