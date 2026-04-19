---
id: 006-04-connect
title: "Connect: Due Date Picker"
description: Wire Riverpod providers and action handlers for Due Date Picker overlay
dependencies:
  - 006-03-convert
tags:
  - connect
  - riverpod
  - overlay-due-date-picker
inputs:
  - lib/widgets/overlays/due_date_picker/due_date_picker.dart
  - .stitch/designs/due-date-picker/SPEC.md
  - lib/providers/
outputs:
  - lib/widgets/overlays/due_date_picker/due_date_picker.dart
checks:
  - id: dart-valid
    description: Dart analysis passes after connecting providers
    cmd: dart analyze lib/widgets/overlays/due_date_picker/due_date_picker.dart
vars:
  prefix: 006
  overlayId: due-date-picker
  title: Due Date Picker
  widgetName: DueDatePicker
  snakeName: due_date_picker
  overlayTaskId: 006-due-date-picker
  parentScreenId: settings
  parentScreenPath: lib/screens/settings/settings_screen.dart
  overlayType: dialog
  specPath: .stitch/designs/due-date-picker/SPEC.md
  metaPath: .stitch/designs/due-date-picker/META.md
  designPath: .stitch/designs/due-date-picker/design.html
  widgetPath: lib/widgets/overlays/due_date_picker/due_date_picker.dart
---

# Connect: Due Date Picker

Wire Riverpod providers and action handlers into the **Due Date Picker** overlay widget.

## Inputs
- `lib/widgets/overlays/due_date_picker/due_date_picker.dart` — The overlay widget (from convert step)
- `.stitch/designs/due-date-picker/SPEC.md` — Overlay specification (for data requirements)
- `lib/providers/` — Existing Riverpod providers

## Task

1. **Read the spec** — Identify what data the overlay reads and what actions it performs
2. **Find existing providers** — Scan `lib/providers/` for providers that supply the needed data
3. **Update the widget**:
   - Change `StatelessWidget` to `ConsumerWidget` if providers are needed
   - Change `build(BuildContext context)` to `build(BuildContext context, WidgetRef ref)`
   - Add `ref.watch()` calls for data the overlay displays
   - Add `ref.read().notifier` calls in action handlers (button taps, form submissions)
   - Wire dismiss/confirm actions to `Navigator.pop(context, result)` where the spec defines a return value

## Provider Patterns

```dart
// Reading data
final items = ref.watch(itemsProvider);

// Triggering actions
onPressed: () {
  ref.read(itemsProvider.notifier).addItem(newItem);
  Navigator.pop(context, newItem);
},

// Loading states
final asyncValue = ref.watch(asyncProvider);
asyncValue.when(
  data: (data) => ...,
  loading: () => const CircularProgressIndicator(),
  error: (e, s) => Text('Error: $e'),
);
```

## Quality Gates

- No new providers created unless the spec explicitly requires state not covered by existing providers
- All `ref.watch` and `ref.read` calls use existing provider names
- Action handlers match the spec's described behavior
- `dart analyze` passes

## Success Criteria

- `lib/widgets/overlays/due_date_picker/due_date_picker.dart` updated with provider connections
- Interactive elements (buttons, toggles) have working callbacks
- Data displayed matches spec requirements
- `dart analyze` passes
