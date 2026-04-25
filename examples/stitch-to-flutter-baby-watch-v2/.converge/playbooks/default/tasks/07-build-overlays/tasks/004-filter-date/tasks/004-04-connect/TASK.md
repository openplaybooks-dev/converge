---
id: 004-04-connect
title: "Connect: Filter Date Range"
description: Wire Riverpod providers and action handlers for Filter Date Range overlay
dependencies:
  - 004-03-convert
tags:
  - connect
  - riverpod
  - overlay-filter-date
inputs:
  - lib/widgets/overlays/filter_date/filter_date.dart
  - .stitch/designs/filter-date/SPEC.md
  - lib/providers/
outputs:
  - lib/widgets/overlays/filter_date/filter_date.dart
checks:
  - id: dart-valid
    description: Dart analysis passes after connecting providers
    cmd: flutter analyze lib/widgets/overlays/filter_date/filter_date.dart
vars:
  prefix: 004
  overlayId: filter-date
  title: Filter Date Range
  widgetName: FilterDate
  snakeName: filter_date
  overlayTaskId: 004-filter-date
  parentScreenId: 
  parentScreenPath: 
  overlayType: bottom-sheet
  specPath: .stitch/designs/filter-date/SPEC.md
  metaPath: .stitch/designs/filter-date/META.md
  designPath: .stitch/designs/filter-date/design.html
  widgetPath: lib/widgets/overlays/filter_date/filter_date.dart
---

# Connect: Filter Date Range

Wire Riverpod providers and action handlers into the **Filter Date Range** overlay widget.

## Inputs
- `lib/widgets/overlays/filter_date/filter_date.dart` — The overlay widget (from convert step)
- `.stitch/designs/filter-date/SPEC.md` — Overlay specification (for data requirements)
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

- `lib/widgets/overlays/filter_date/filter_date.dart` updated with provider connections
- Interactive elements (buttons, toggles) have working callbacks
- Data displayed matches spec requirements
- `dart analyze` passes
