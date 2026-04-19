---
id: 007-04-connect
title: "Connect: Delete Entry Confirmation"
description: Wire Riverpod providers and action handlers for Delete Entry Confirmation overlay
dependencies:
  - 007-03-convert
tags:
  - connect
  - riverpod
  - overlay-delete-entry
inputs:
  - lib/widgets/overlays/delete_entry/delete_entry.dart
  - .stitch/designs/delete-entry/SPEC.md
  - lib/providers/
outputs:
  - lib/widgets/overlays/delete_entry/delete_entry.dart
checks:
  - id: dart-valid
    description: Dart analysis passes after connecting providers
    cmd: dart analyze lib/widgets/overlays/delete_entry/delete_entry.dart
vars:
  prefix: 007
  overlayId: delete-entry
  title: Delete Entry Confirmation
  widgetName: DeleteEntry
  snakeName: delete_entry
  overlayTaskId: 007-delete-entry
  parentScreenId: health-log
  parentScreenPath: lib/screens/health_log/health_log_screen.dart
  overlayType: dialog
  specPath: .stitch/designs/delete-entry/SPEC.md
  metaPath: .stitch/designs/delete-entry/META.md
  designPath: .stitch/designs/delete-entry/design.html
  widgetPath: lib/widgets/overlays/delete_entry/delete_entry.dart
---

# Connect: Delete Entry Confirmation

Wire Riverpod providers and action handlers into the **Delete Entry Confirmation** overlay widget.

## Inputs
- `lib/widgets/overlays/delete_entry/delete_entry.dart` — The overlay widget (from convert step)
- `.stitch/designs/delete-entry/SPEC.md` — Overlay specification (for data requirements)
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

- `lib/widgets/overlays/delete_entry/delete_entry.dart` updated with provider connections
- Interactive elements (buttons, toggles) have working callbacks
- Data displayed matches spec requirements
- `dart analyze` passes
