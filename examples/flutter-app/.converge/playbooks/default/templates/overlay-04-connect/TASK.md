---
title: "Connect: {{title}}"
description: "Wire Riverpod providers and action handlers for {{title}} overlay"
tags:
  - connect
  - riverpod
  - overlay-{{overlayId}}
vars:
  overlayId:
  title:
  specPath:
  widgetPath:
inputs:
  - "{{widgetPath}}"
  - "{{specPath}}"
  - lib/providers/
outputs:
  - "{{widgetPath}}"
checks:
  - id: dart-valid
    cmd: "dart analyze {{widgetPath}}"
    description: "Dart analysis passes after connecting providers"
---

# Connect: {{title}}

Wire Riverpod providers and action handlers into the **{{title}}** overlay widget.

## Inputs
- `{{widgetPath}}` — The overlay widget (from convert step)
- `{{specPath}}` — Overlay specification (for data requirements)
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

- `{{widgetPath}}` updated with provider connections
- Interactive elements (buttons, toggles) have working callbacks
- Data displayed matches spec requirements
- `dart analyze` passes
