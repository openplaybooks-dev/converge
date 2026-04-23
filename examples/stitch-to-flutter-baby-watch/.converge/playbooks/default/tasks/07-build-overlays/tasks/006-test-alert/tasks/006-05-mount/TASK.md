---
id: 006-05-mount
title: "Mount: Test Alert Countdown"
description: Mount Test Alert Countdown overlay in parent screen and wire trigger
dependencies:
  - 006-04-connect
tags:
  - mount
  - overlay-test-alert
inputs:
  - lib/widgets/overlays/test_alert/test_alert.dart
  - .stitch/designs/test-alert/SPEC.md
  - 
outputs:
  - 
checks:
  - id: parent-imports-overlay
    description: Parent screen imports the overlay widget
    cmd: "grep -q 'test_alert' lib/screens/home/home_screen.dart"
  - id: parent-shows-overlay
    description: Parent screen calls showModalBottomSheet or showDialog
    cmd: "grep -qE 'showModalBottomSheet|showDialog' lib/screens/home/home_screen.dart"
  - id: dart-valid
    description: Dart analysis passes for parent screen
    cmd: dart analyze lib/screens/home/home_screen.dart 
vars:
  prefix: 006
  overlayId: test-alert
  title: Test Alert Countdown
  widgetName: TestAlert
  snakeName: test_alert
  overlayTaskId: 006-test-alert
  parentScreenId: 
  parentScreenPath: 
  overlayType: bottom-sheet
  specPath: .stitch/designs/test-alert/SPEC.md
  metaPath: .stitch/designs/test-alert/META.md
  designPath: .stitch/designs/test-alert/design.html
  widgetPath: lib/widgets/overlays/test_alert/test_alert.dart
---

# Mount: Test Alert Countdown

Mount the **Test Alert Countdown** overlay in its parent screen (****) and wire the trigger.

## Inputs
- `lib/widgets/overlays/test_alert/test_alert.dart` — The overlay widget file
- `.stitch/designs/test-alert/SPEC.md` — Overlay specification (describes trigger and dismiss behavior)
- `` — The parent screen file to modify

## Task

1. **Read the spec** — Identify:
   - What UI element triggers the overlay (which button, tap area, etc.)
   - The overlay type (bottom-sheet)
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
   import 'package:<pkg>/widgets/overlays/test_alert/test_alert.dart';
   ```

4. **Wire the trigger** — Apply the appropriate replacement from the table above:

   ### Replace builder body (existing `showModalBottomSheet`/`showDialog`):
   ```dart
   // BEFORE:
   builder: (_) => const Placeholder(),
   // AFTER:
   builder: (_) => const TestAlert(),
   ```

   ### Replace stub callback (existing `SnackBar`/`debugPrint`):
   ```dart
   onPressed: () async {
     final result = await showModalBottomSheet<ReturnType>(
       context: context,
       isScrollControlled: true,
       builder: (_) => const TestAlert(),
     );
     if (result != null && context.mounted) {
       // Handle result per spec
     }
   },
   ```

   ### Add new trigger (no existing handler):
   Wrap the element in `InkWell` or `GestureDetector` with the overlay call.

5. **Verify** — Run `dart analyze `

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

- `` updated with overlay import
- Trigger element wired to show the overlay
- Return value handled if spec requires it
- `dart analyze` passes
