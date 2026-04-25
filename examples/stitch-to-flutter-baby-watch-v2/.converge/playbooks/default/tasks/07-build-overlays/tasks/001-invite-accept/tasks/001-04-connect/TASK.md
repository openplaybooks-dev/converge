---
id: 001-04-connect
title: "Connect: Invite Accept"
description: Wire Riverpod providers and action handlers for Invite Accept overlay
dependencies:
  - 001-03-convert
tags:
  - connect
  - riverpod
  - overlay-invite-accept
inputs:
  - lib/widgets/overlays/invite_accept/invite_accept.dart
  - .stitch/designs/invite-accept/SPEC.md
  - lib/providers/
outputs:
  - lib/widgets/overlays/invite_accept/invite_accept.dart
checks:
  - id: dart-valid
    description: Dart analysis passes after connecting providers
    cmd: dart analyze lib/widgets/overlays/invite_accept/invite_accept.dart
vars:
  prefix: 001
  overlayId: invite-accept
  title: Invite Accept
  widgetName: InviteAccept
  snakeName: invite_accept
  overlayTaskId: 001-invite-accept
  parentScreenId: co-guardians-list
  parentScreenPath: lib/screens/co_guardians_list/co_guardians_list_screen.dart
  overlayType: dialog
  specPath: .stitch/designs/invite-accept/SPEC.md
  metaPath: .stitch/designs/invite-accept/META.md
  designPath: .stitch/designs/invite-accept/design.html
  widgetPath: lib/widgets/overlays/invite_accept/invite_accept.dart
  htmlReference: .stitch/references/co_guardians_list_phase_2/code.html
  htmlReferenceInput: "  - \".stitch/references/co_guardians_list_phase_2/code.html\"\n"
---

# Connect: Invite Accept

Wire Riverpod providers and action handlers into the **Invite Accept** overlay widget.

## Inputs
- `lib/widgets/overlays/invite_accept/invite_accept.dart` — The overlay widget (from convert step)
- `.stitch/designs/invite-accept/SPEC.md` — Overlay specification (for data requirements)
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

- `lib/widgets/overlays/invite_accept/invite_accept.dart` updated with provider connections
- Interactive elements (buttons, toggles) have working callbacks
- Data displayed matches spec requirements
- `dart analyze` passes
