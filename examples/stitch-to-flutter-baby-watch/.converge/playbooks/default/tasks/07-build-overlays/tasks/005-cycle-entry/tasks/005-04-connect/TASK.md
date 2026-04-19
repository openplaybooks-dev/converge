---
id: 005-04-connect
title: "Connect: Cycle Entry"
description: Wire Riverpod providers and action handlers for Cycle Entry overlay
dependencies:
  - 005-03-convert
tags:
  - connect
  - riverpod
  - overlay-cycle-entry
inputs:
  - lib/widgets/overlays/cycle_entry/cycle_entry.dart
  - .stitch/designs/cycle-entry/SPEC.md
  - lib/providers/
outputs:
  - lib/widgets/overlays/cycle_entry/cycle_entry.dart
checks:
  - id: dart-valid
    description: Dart analysis passes after connecting providers
    cmd: dart analyze lib/widgets/overlays/cycle_entry/cycle_entry.dart
vars:
  prefix: 005
  overlayId: cycle-entry
  title: Cycle Entry
  widgetName: CycleEntry
  snakeName: cycle_entry
  overlayTaskId: 005-cycle-entry
  parentScreenId: cycle-tracking
  parentScreenPath: lib/screens/cycle_tracking/cycle_tracking_screen.dart
  overlayType: bottom-sheet
  specPath: .stitch/designs/cycle-entry/SPEC.md
  metaPath: .stitch/designs/cycle-entry/META.md
  designPath: .stitch/designs/cycle-entry/design.html
  widgetPath: lib/widgets/overlays/cycle_entry/cycle_entry.dart
---

# Connect: Cycle Entry

Wire Riverpod providers and action handlers into the **Cycle Entry** overlay widget.

## Inputs
- `lib/widgets/overlays/cycle_entry/cycle_entry.dart` — The overlay widget (from convert step)
- `.stitch/designs/cycle-entry/SPEC.md` — Overlay specification (for data requirements)
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

- `lib/widgets/overlays/cycle_entry/cycle_entry.dart` updated with provider connections
- Interactive elements (buttons, toggles) have working callbacks
- Data displayed matches spec requirements
- `dart analyze` passes
