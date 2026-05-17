---
title: "Mount: {{title}}"
description: "Mount {{title}} overlay in parent screen and wire trigger"
tags:
  - mount
  - overlay-{{overlayId}}
vars:
  overlayId:
  title:
  widgetName:
  snakeName:
  overlayType:
  parentScreenId:
  parentScreenPath:
  specPath:
  widgetPath:
inputs:
  - "{{widgetPath}}"
  - "{{specPath}}"
  - "{{parentScreenPath}}"
outputs:
  - "{{parentScreenPath}}"
checks:
  - id: parent-imports-overlay
    cmd: "grep -q '{{snakeName}}' {{parentScreenPath}}"
    description: "Parent screen imports the overlay widget"
  - id: parent-shows-overlay
    cmd: "grep -qE 'showModalBottomSheet|showDialog' {{parentScreenPath}}"
    description: "Parent screen calls showModalBottomSheet or showDialog"
  - id: dart-valid
    cmd: "dart analyze {{parentScreenPath}}"
    description: "Dart analysis passes for parent screen"
---

# Mount: {{title}}

Mount the **{{title}}** overlay in its parent screen (**{{parentScreenId}}**) and wire the trigger.

## Inputs
- `{{widgetPath}}` — The overlay widget file
- `{{specPath}}` — Overlay specification (describes trigger and dismiss behavior)
- `{{parentScreenPath}}` — The parent screen file to modify

## Task

1. **Read the spec** — Identify:
   - What UI element triggers the overlay (which button, tap area, etc.)
   - The overlay type ({{overlayType}})
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
   import 'package:<pkg>/widgets/overlays/{{snakeName}}/{{snakeName}}.dart';
   ```

4. **Wire the trigger** — Apply the appropriate replacement from the table above:

   ### Replace builder body (existing `showModalBottomSheet`/`showDialog`):
   ```dart
   // BEFORE:
   builder: (_) => const Placeholder(),
   // AFTER:
   builder: (_) => const {{widgetName}}(),
   ```

   ### Replace stub callback (existing `SnackBar`/`debugPrint`):
   ```dart
   onPressed: () async {
     final result = await showModalBottomSheet<ReturnType>(
       context: context,
       isScrollControlled: true,
       builder: (_) => const {{widgetName}}(),
     );
     if (result != null && context.mounted) {
       // Handle result per spec
     }
   },
   ```

   ### Add new trigger (no existing handler):
   Wrap the element in `InkWell` or `GestureDetector` with the overlay call.

5. **Verify** — Run `dart analyze {{parentScreenPath}}`

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

- `{{parentScreenPath}}` updated with overlay import
- Trigger element wired to show the overlay
- Return value handled if spec requires it
- `dart analyze` passes
