---
id: 012-06-lift
title: "Lift: Accept Invitation"
description: Lift shared widgets from Accept Invitation to lib/widgets/
dependencies:
  - 012-05-split
blocking: true
tags:
  - lift
  - screen-invite-accept
inputs:
  - .stitch/designs/invite-accept/widgets.jsonl
  - "lib/screens/invite_accept/widgets/**/*.dart"
outputs:
  - "lib/widgets/**/*.dart"
wbs:
  type: nodejs
  path: ./wbs.js
vars:
  prefix: 012
  screenId: invite-accept
  title: Accept Invitation
  widgetName: InviteAccept
  snakeName: invite_accept
  route: "/invite/:code"
  screenPath: lib/screens/invite_accept/invite_accept_screen.dart
  widgetsJsonPath: .stitch/designs/invite-accept/widgets.jsonl
  localWidgetsDir: lib/screens/invite_accept/widgets
  screenTaskId: 012-invite-accept
  specPath: .stitch/designs/invite-accept/SPEC.md
  metaPath: .stitch/designs/invite-accept/META.md
  designPath: .stitch/designs/invite-accept/design.html
  prevScreenLastId: 011-06-lift
  htmlReference: .stitch/references/co_guardians_list_phase_2/code.html
  htmlReferenceInput: "  - \".stitch/references/co_guardians_list_phase_2/code.html\"\n"
---

# Lift: Accept Invitation

Examine each widget in `lib/screens/invite_accept/widgets/` that was marked `shared: true` in `.stitch/designs/invite-accept/widgets.jsonl`.

For each shared widget:
1. Move from `lib/screens/invite_accept/widgets/{name}.dart` to `lib/widgets/{name}.dart`
2. Update all imports in the screen and any other files referencing it
3. Verify `dart analyze` passes after each move
