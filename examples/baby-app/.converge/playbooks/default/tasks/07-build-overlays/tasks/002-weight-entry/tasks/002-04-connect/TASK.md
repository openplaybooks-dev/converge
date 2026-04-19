---
id: 002-04-connect
title: "Connect: Weight Entry"
description: Wire Riverpod providers and action handlers for Weight Entry overlay
dependencies:
  - 002-03-convert
tags:
  - connect
  - riverpod
  - overlay-weight-entry
inputs:
  - lib/widgets/overlays/weight_entry/weight_entry.dart
  - .stitch/designs/weight-entry/SPEC.md
  - lib/providers/
outputs:
  - lib/widgets/overlays/weight_entry/weight_entry.dart
checks:
  - id: dart-valid
    description: Dart analysis passes after connecting providers
    cmd: dart analyze lib/widgets/overlays/weight_entry/weight_entry.dart
vars:
  prefix: 002
  overlayId: weight-entry
  title: Weight Entry
  widgetName: WeightEntry
  snakeName: weight_entry
  overlayTaskId: 002-weight-entry
  parentScreenId: weight-nutrition
  parentScreenPath: lib/screens/weight_nutrition/weight_nutrition_screen.dart
  overlayType: bottom-sheet
  specPath: .stitch/designs/weight-entry/SPEC.md
  metaPath: .stitch/designs/weight-entry/META.md
  designPath: .stitch/designs/weight-entry/design.html
  widgetPath: lib/widgets/overlays/weight_entry/weight_entry.dart
---

# Connect: Weight Entry

Wire Riverpod providers and action handlers into the **Weight Entry** overlay widget.

## Inputs
- `lib/widgets/overlays/weight_entry/weight_entry.dart` — The overlay widget (from convert step)
- `.stitch/designs/weight-entry/SPEC.md` — Overlay specification (for data requirements)
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

- `lib/widgets/overlays/weight_entry/weight_entry.dart` updated with provider connections
- Interactive elements (buttons, toggles) have working callbacks
- Data displayed matches spec requirements
- `dart analyze` passes
