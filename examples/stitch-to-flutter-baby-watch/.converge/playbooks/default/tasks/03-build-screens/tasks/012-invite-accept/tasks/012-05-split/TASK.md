---
id: 012-05-split
title: "Split: Accept Invitation"
description: Extract widgets from Accept Invitation screen into local widgets/
dependencies:
  - 012-04-analyze
tags:
  - split
  - screen-invite-accept
inputs:
  - .stitch/designs/invite-accept/widgets.jsonl
outputs:
  - "lib/screens/invite_accept/widgets/**/*.dart"
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

# Split: Accept Invitation

Extract each widget identified in `.stitch/designs/invite-accept/widgets.jsonl` into its own file under `lib/screens/invite_accept/widgets/`.

For each widget:
1. Create `lib/screens/invite_accept/widgets/{snake_case_name}.dart`
2. Move the widget subtree from the screen file into the new file
3. Update the screen file to import and use the extracted widget
4. Verify `dart analyze` passes after each extraction
