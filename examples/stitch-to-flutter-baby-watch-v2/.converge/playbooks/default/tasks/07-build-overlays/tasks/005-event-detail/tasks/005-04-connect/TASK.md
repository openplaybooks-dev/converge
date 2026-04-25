---
id: 005-04-connect
title: "Connect: Event Detail"
description: Wire Riverpod providers and action handlers for Event Detail overlay
dependencies:
  - 005-03-convert
tags:
  - connect
  - riverpod
  - overlay-event-detail
inputs:
  - lib/widgets/overlays/event_detail/event_detail.dart
  - .stitch/designs/event-detail/SPEC.md
  - lib/providers/
outputs:
  - lib/widgets/overlays/event_detail/event_detail.dart
checks:
  - id: dart-valid
    description: Dart analysis passes after connecting providers
    cmd: dart analyze lib/widgets/overlays/event_detail/event_detail.dart
vars:
  prefix: 005
  overlayId: event-detail
  title: Event Detail
  widgetName: EventDetail
  snakeName: event_detail
  overlayTaskId: 005-event-detail
  parentScreenId: 
  parentScreenPath: 
  overlayType: bottom-sheet
  specPath: .stitch/designs/event-detail/SPEC.md
  metaPath: .stitch/designs/event-detail/META.md
  designPath: .stitch/designs/event-detail/design.html
  widgetPath: lib/widgets/overlays/event_detail/event_detail.dart
---

# Connect: Event Detail

Wire Riverpod providers and action handlers into the **Event Detail** overlay widget.

## Inputs
- `lib/widgets/overlays/event_detail/event_detail.dart` — The overlay widget (from convert step)
- `.stitch/designs/event-detail/SPEC.md` — Overlay specification (for data requirements)
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

- `lib/widgets/overlays/event_detail/event_detail.dart` updated with provider connections
- Interactive elements (buttons, toggles) have working callbacks
- Data displayed matches spec requirements
- `dart analyze` passes
