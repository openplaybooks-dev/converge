---
id: 001-05-mount
title: "Mount: Invite Accept"
description: Mount Invite Accept overlay in parent screen and wire trigger
dependencies:
  - 001-04-connect
tags:
  - mount
  - overlay-invite-accept
inputs:
  - lib/widgets/overlays/invite_accept/invite_accept.dart
  - .stitch/designs/invite-accept/SPEC.md
  - lib/screens/co_guardians_list/co_guardians_list_screen.dart
outputs:
  - lib/screens/co_guardians_list/co_guardians_list_screen.dart
checks:
  - id: parent-imports-overlay
    description: Parent screen imports the overlay widget
    cmd: "grep -q 'invite_accept' lib/screens/co_guardians_list/co_guardians_list_screen.dart"
  - id: parent-shows-overlay
    description: Parent screen calls showModalBottomSheet or showDialog
    cmd: "grep -qE 'showModalBottomSheet|showDialog' lib/screens/co_guardians_list/co_guardians_list_screen.dart"
  - id: dart-valid
    description: Dart analysis passes for parent screen
    cmd: dart analyze lib/screens/co_guardians_list/co_guardians_list_screen.dart
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

# Mount: Invite Accept

Mount the **Invite Accept** overlay in its parent screen (**co-guardians-list**) and wire the trigger.

## Inputs
- `lib/widgets/overlays/invite_accept/invite_accept.dart` — The overlay widget file
- `.stitch/designs/invite-accept/SPEC.md` — Overlay specification (describes trigger and dismiss behavior)
- `lib/screens/co_guardians_list/co_guardians_list_screen.dart` — The parent screen file to modify

## Task

1. **Read the spec** — Identify:
   - What UI element triggers the overlay (which button, tap area, etc.)
   - The overlay type (dialog)
   - Any return value handling

2. **Read the parent screen** — Find the trigger element described in the spec.

   **The `03-build-screens` pipeline typically generates screens with placeholder triggers** — buttons, FABs, or tap areas that stub out overlay behavior. Identify the placeholder pattern:

   | Placeholder Pattern | What It Means | Action |
   |---|---|---|
   | `showModalBottomSheet(builder: (_) => const Placeholder())` | Trigger exists, builder is stub | Replace builder body only |
   | `showModalBottomSheet(builder: (_) => ...)` with inline widget tree | Trigger exists, builder has temp content | Replace builder body only |
   | `ScaffoldMessenger.of(context).showSnackBar(...)` | Trigger exists, action is stub | Replace entire callback body |
   | `debugPrint(...)` in `onTap`/`onPressed` | Trigger exists, action is stub | Replace callback body |
   | Widget with `Semantics(label: ...)` but no `onTap` | Trigger UI exists, no handler | Wrap in `InkWell`/`GestureDetector` |
   | No matching trigger element | Nothing exists | Create trigger per spec |

   If a trigger already exists, **replace the placeholder body** — do NOT duplicate the `showModalBottomSheet`/`showDialog` call.

3. **Add import** — Add the overlay widget import to the parent screen (use the project's package name from `pubspec.yaml`):
   ```dart
   import 'package:<pkg>/widgets/overlays/invite_accept/invite_accept.dart';
   ```

4. **Wire the trigger** — Apply the appropriate replacement from the table above:

   ### Replace builder body (existing `showModalBottomSheet`/`showDialog`):
   ```dart
   // BEFORE:
   builder: (_) => const Placeholder(),
   // AFTER:
   builder: (_) => const InviteAccept(),
   ```

   ### Replace stub callback (existing `SnackBar`/`debugPrint`):
   ```dart
   onPressed: () async {
     final result = await showModalBottomSheet<ReturnType>(
       context: context,
       isScrollControlled: true,
       builder: (_) => const InviteAccept(),
     );
     if (result != null && context.mounted) {
       // Handle result per spec
     }
   },
   ```

   ### Add new trigger (no existing handler):
   Wrap the element in `InkWell` or `GestureDetector` with the overlay call.

5. **Verify** — Run `dart analyze lib/screens/co_guardians_list/co_guardians_list_screen.dart`

## Important Notes

- Do NOT create a new button or trigger if one already exists — reuse it
- Do NOT duplicate `showModalBottomSheet`/`showDialog` calls — if one already exists, replace its builder content only
- If the spec defines a return value, handle it in the parent after `await`
- Use `context.mounted` check after any `await` before using context

## Quality Gates

- Parent screen imports the overlay widget
- Trigger element calls `showModalBottomSheet` or `showDialog`
- No hardcoded colors or styles introduced
- `dart analyze` passes for the parent screen

## Success Criteria

- `lib/screens/co_guardians_list/co_guardians_list_screen.dart` updated with overlay import
- Trigger element wired to show the overlay
- Return value handled if spec requires it
- `dart analyze` passes
