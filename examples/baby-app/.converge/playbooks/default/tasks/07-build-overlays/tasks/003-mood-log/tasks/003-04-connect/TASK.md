---
id: 003-04-connect
title: "Connect: Mood Logging"
description: Wire Riverpod providers and action handlers for Mood Logging overlay
dependencies:
  - 003-03-convert
tags:
  - connect
  - riverpod
  - overlay-mood-log
inputs:
  - lib/widgets/overlays/mood_log/mood_log.dart
  - .stitch/designs/mood-log/SPEC.md
  - lib/providers/
outputs:
  - lib/widgets/overlays/mood_log/mood_log.dart
checks:
  - id: dart-valid
    description: Dart analysis passes after connecting providers
    cmd: dart analyze lib/widgets/overlays/mood_log/mood_log.dart
vars:
  prefix: 003
  overlayId: mood-log
  title: Mood Logging
  widgetName: MoodLog
  snakeName: mood_log
  overlayTaskId: 003-mood-log
  parentScreenId: mood-wellness
  parentScreenPath: lib/screens/mood_wellness/mood_wellness_screen.dart
  overlayType: bottom-sheet
  specPath: .stitch/designs/mood-log/SPEC.md
  metaPath: .stitch/designs/mood-log/META.md
  designPath: .stitch/designs/mood-log/design.html
  widgetPath: lib/widgets/overlays/mood_log/mood_log.dart
---

# Connect: Mood Logging

Wire Riverpod providers and action handlers into the **Mood Logging** overlay widget.

## Inputs
- `lib/widgets/overlays/mood_log/mood_log.dart` — The overlay widget (from convert step)
- `.stitch/designs/mood-log/SPEC.md` — Overlay specification (for data requirements)
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

- `lib/widgets/overlays/mood_log/mood_log.dart` updated with provider connections
- Interactive elements (buttons, toggles) have working callbacks
- Data displayed matches spec requirements
- `dart analyze` passes
