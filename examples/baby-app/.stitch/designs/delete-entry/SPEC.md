# Overlay Spec: Delete Entry Confirmation

## 1. Overlay Title
Delete Entry Confirmation

## 2. Overlay Type
**dialog**

## 3. Parent Screen
**health-log** (`lib/screens/health_log/health_log_screen.dart`)

## 4. Trigger
Swipe a list item (doctor visit, symptom, or reminder) horizontally in any of the three Health Log tabs. The `health_log_screen.dart` currently renders list items via `DoctorVisitCard` widgets inside `ListView.separated` (lines 154–169) without any `Dismissible` wrapper or swipe gesture. The swipe-to-delete gesture and this confirmation dialog both need to be wired in.

### Existing Placeholder Pattern
There is no existing placeholder for delete — the list items are rendered as plain cards without `Dismissible` or long-press handlers. The `05-mount` step should:
1. Wrap each list item in a `Dismissible` widget with a `confirmDismiss` callback
2. The `confirmDismiss` callback calls `showDialog()` presenting the `DeleteEntry` dialog
3. If the dialog returns `true`, the item is removed; if `false` or `null`, the dismiss is cancelled

## 5. Purpose
Provides a safety gate before permanently removing a health log entry (doctor visit, symptom record, or reminder). Destructive actions require explicit confirmation to prevent accidental data loss from an unintended swipe. The dialog pattern (rather than bottom-sheet) is appropriate because the interaction is brief, binary (confirm or cancel), and should feel interruptive enough to make the user pause.

## 6. Widget Name
`DeleteEntry`

## 7. Design Tokens

### Colors
| Token | Value | Usage |
|-------|-------|-------|
| Cloud White | `#FFFFFF` | Dialog background |
| Fault Red | `#E85C5C` | Delete button fill, warning icon color |
| Ink Charcoal | `#2A2A3A` | Title text, body text |
| Muted Quartz | `#8B8B9C` | Descriptive body text |
| Dim Veil | `rgba(42, 42, 58, 0.24)` | Backdrop overlay behind dialog |
| Ghost Divide | `rgba(42, 42, 58, 0.06)` | Divider between body and action row |
| Chip Mist | `rgba(139, 126, 216, 0.08)` | Cancel button background |

### Typography
| Role | Scale | Weight | Usage |
|------|-------|--------|-------|
| Dialog title | Subheading (1.125rem) | 600 | "Delete Entry" heading |
| Body text | Body (1rem) | 400 | Confirmation message |
| Button text | Body (1rem) | 600 | "Delete" and "Cancel" labels |

### Spacing
| Token | Value | Usage |
|-------|-------|-------|
| Internal padding | 24dp | Dialog horizontal and vertical padding |
| Title-to-body gap | 12dp | Between title and description text |
| Body-to-actions gap | 24dp | Between description and action buttons |
| Button gap | 12dp | Between Cancel and Delete buttons |

### Elevation
- Dialog shadow: `0 8px 32px rgba(139, 126, 216, 0.14)` (Prominent tier)
- Dialog border-radius: 24dp

### Animation
- Dialog entry: scale from 0.95 to 1.0 with opacity fade, 250ms spring curve
- Dialog exit: fade out, 180ms ease-out
- Backdrop: Dim Veil fades in over 200ms

## 8. Layout

### Container Structure (Dialog)
- **Max width**: 320dp (centered horizontally and vertically)
- **Border-radius**: 24dp all corners
- **Background**: Cloud White, solid fill
- **Shadow**: Prominent tier (`0 8px 32px rgba(139, 126, 216, 0.14)`)
- **Backdrop**: Dim Veil overlay on content behind
- **Content column**: Title, body text, action row — vertically stacked with 24dp internal padding

## 9. Sections

### 9.1 Title
- Text: "Delete Entry"
- Style: Subheading scale (1.125rem), Ink Charcoal, weight 600
- Alignment: Left

### 9.2 Body Text
- Text: "Are you sure you want to delete this entry? This action cannot be undone."
- Style: Body scale (1rem), Muted Quartz, weight 400
- Alignment: Left
- Max lines: 3

### 9.3 Action Row
A horizontal row of two pill-shaped buttons, right-aligned.

**Cancel Button**
- Style: Ghost button — Chip Mist background, Ink Charcoal text
- Text: "Cancel" — Body scale, weight 600
- Shape: Fully rounded pill (border-radius 9999px)
- Height: 44dp
- Horizontal padding: 24dp
- Tap behavior: Dismiss dialog, return `false`

**Delete Button**
- Style: Destructive — Fault Red (#E85C5C) fill, Cloud White text
- Text: "Delete" — Body scale, weight 600
- Shape: Fully rounded pill (border-radius 9999px)
- Height: 44dp
- Horizontal padding: 24dp
- Press state: brightness shifts to 105%, `translateY(1px)`
- Tap behavior: Dismiss dialog, return `true`

## 10. Data

### Entities
The dialog does not display or edit entity fields directly. It receives context about which entry is being deleted (entry type and summary) for the confirmation message, but the deletion logic is handled by the parent screen.

### Fields Displayed
- Entry summary text (passed as a parameter) — optionally shown in the body text for context (e.g., "Are you sure you want to delete 'Regular checkup — all vitals normal'?")

## 11. Dismiss Behavior
- **Tap "Cancel" button**: Dismiss dialog, return `false` — entry is not deleted
- **Tap "Delete" button**: Dismiss dialog, return `true` — parent proceeds with deletion
- **Tap outside** (on backdrop): Dismiss dialog, return `null` — treated as cancel, entry is not deleted
- **Back gesture / hardware back**: Dismiss dialog, return `null` — treated as cancel

## 12. Return Value
Returns a `bool?` via `Navigator.pop(context, value)`:
- `true` — user confirmed deletion; parent removes the entry from the list
- `false` or `null` — user cancelled; parent keeps the entry and cancels the `Dismissible` animation

The parent screen uses this in a `Dismissible.confirmDismiss` callback:
```dart
confirmDismiss: (direction) async {
  return await showDialog<bool>(
    context: context,
    builder: (_) => const DeleteEntry(),
  );
},
```

## 13. Accessibility
- **Semantics label** on dialog: "Delete entry confirmation dialog"
- **Semantics label** on cancel button: "Cancel, keep entry"
- **Semantics label** on delete button: "Delete entry permanently"
- **Focus trapping**: Focus stays within the dialog while open; tab order is Cancel then Delete (Cancel first to reduce accidental destructive action)
- **Screen reader announcement**: When dialog opens, announce "Delete entry? Are you sure you want to delete this entry? This action cannot be undone."
- **Live region**: Dialog title area marked as a live region for immediate announcement
