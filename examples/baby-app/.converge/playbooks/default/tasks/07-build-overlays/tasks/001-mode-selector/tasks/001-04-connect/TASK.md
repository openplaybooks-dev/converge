---
id: 001-04-connect
title: "Connect: Mode Selection"
description: Wire Riverpod providers and action handlers for Mode Selection overlay
dependencies:
  - 001-03-convert
tags:
  - connect
  - riverpod
  - overlay-mode-selector
inputs:
  - lib/widgets/overlays/mode_selector/mode_selector.dart
  - .stitch/designs/mode-selector/SPEC.md
  - lib/providers/
outputs:
  - lib/widgets/overlays/mode_selector/mode_selector.dart
checks:
  - id: dart-valid
    description: Dart analysis passes after connecting providers
    cmd: dart analyze lib/widgets/overlays/mode_selector/mode_selector.dart
vars:
  prefix: 001
  overlayId: mode-selector
  title: Mode Selection
  widgetName: ModeSelector
  snakeName: mode_selector
  overlayTaskId: 001-mode-selector
  parentScreenId: home
  parentScreenPath: lib/screens/home/home_screen.dart
  overlayType: bottom-sheet
  specPath: .stitch/designs/mode-selector/SPEC.md
  metaPath: .stitch/designs/mode-selector/META.md
  designPath: .stitch/designs/mode-selector/design.html
  widgetPath: lib/widgets/overlays/mode_selector/mode_selector.dart
---

# Connect: Mode Selection

Wire Riverpod providers and action handlers into the **Mode Selection** overlay widget.

## Inputs
- `lib/widgets/overlays/mode_selector/mode_selector.dart` — The overlay widget (from convert step)
- `.stitch/designs/mode-selector/SPEC.md` — Overlay specification (for data requirements)
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

- `lib/widgets/overlays/mode_selector/mode_selector.dart` updated with provider connections
- Interactive elements (buttons, toggles) have working callbacks
- Data displayed matches spec requirements
- `dart analyze` passes
