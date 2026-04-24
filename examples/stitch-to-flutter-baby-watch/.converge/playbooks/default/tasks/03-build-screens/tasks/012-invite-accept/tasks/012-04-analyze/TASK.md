---
id: 012-04-analyze
title: "Analyze: Accept Invitation"
description: Identify extractable widget regions in Accept Invitation
dependencies:
  - 012-03-convert
tags:
  - analyze
  - screen-invite-accept
inputs:
  - lib/screens/invite_accept/invite_accept_screen.dart
outputs:
  - .stitch/designs/invite-accept/widgets.jsonl
checks:
  - id: widgets-json-exists
    description: widgets.jsonl exists for invite-accept
    cmd: test -f .stitch/designs/invite-accept/widgets.jsonl
plan:
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

# Analyze: Accept Invitation

Analyze the screen widget and identify extractable widget regions.

## Input
- `lib/screens/invite_accept/invite_accept_screen.dart` — The screen widget file

## Task

Read the screen file and identify widget subtrees that should be extracted into separate widget files.

Write `.stitch/designs/invite-accept/widgets.jsonl` with one JSON object per line (JSONL format):

```jsonl
{"name": "WidgetName", "grep": "unique string to locate in source", "description": "what it renders", "shared": false}
{"name": "AnotherWidget", "grep": "unique string", "description": "what it renders", "shared": true}
```

## Extraction Criteria

Extract a region when:
- It's a self-contained visual block (card, list item, section header)
- It has 15+ lines of widget code
- It could be reused across screens (`shared: true`)
- It has its own data/state concerns

Do NOT extract:
- Simple `Text`, `Icon`, or `SizedBox` widgets
- Layout wrappers (`Padding`, `Center`)
- Anything under 10 lines

## Success Criteria

- `.stitch/designs/invite-accept/widgets.jsonl` exists with valid JSONL
- Each entry has: name, grep, description, shared
- Widget names use PascalCase
