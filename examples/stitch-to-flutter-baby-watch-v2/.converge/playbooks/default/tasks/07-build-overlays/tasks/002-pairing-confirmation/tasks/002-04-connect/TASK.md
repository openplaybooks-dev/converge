---
id: 002-04-connect
title: "Connect: Pairing Confirmation"
description: Wire Riverpod providers and action handlers for Pairing Confirmation overlay
dependencies:
  - 002-03-convert
tags:
  - connect
  - riverpod
  - overlay-pairing-confirmation
inputs:
  - lib/widgets/overlays/pairing_confirmation/pairing_confirmation.dart
  - .stitch/designs/pairing-confirmation/SPEC.md
  - lib/providers/
outputs:
  - lib/widgets/overlays/pairing_confirmation/pairing_confirmation.dart
checks:
  - id: dart-valid
    description: Dart analysis passes after connecting providers
    cmd: flutter analyze lib/widgets/overlays/pairing_confirmation/pairing_confirmation.dart
vars:
  prefix: 002
  overlayId: pairing-confirmation
  title: Pairing Confirmation
  widgetName: PairingConfirmation
  snakeName: pairing_confirmation
  overlayTaskId: 002-pairing-confirmation
  parentScreenId: 
  parentScreenPath: 
  overlayType: bottom-sheet
  specPath: .stitch/designs/pairing-confirmation/SPEC.md
  metaPath: .stitch/designs/pairing-confirmation/META.md
  designPath: .stitch/designs/pairing-confirmation/design.html
  widgetPath: lib/widgets/overlays/pairing_confirmation/pairing_confirmation.dart
---

# Connect: Pairing Confirmation

Wire Riverpod providers and action handlers into the **Pairing Confirmation** overlay widget.

## Inputs
- `lib/widgets/overlays/pairing_confirmation/pairing_confirmation.dart` — The overlay widget (from convert step)
- `.stitch/designs/pairing-confirmation/SPEC.md` — Overlay specification (for data requirements)
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

- `lib/widgets/overlays/pairing_confirmation/pairing_confirmation.dart` updated with provider connections
- Interactive elements (buttons, toggles) have working callbacks
- Data displayed matches spec requirements
- `dart analyze` passes
