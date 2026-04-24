---
id: 004-04-analyze
title: "Analyze: Edit Beacon"
description: Identify extractable widget regions in Edit Beacon
dependencies:
  - 004-03-convert
tags:
  - analyze
  - screen-beacon-edit
inputs:
  - lib/screens/beacon_edit/beacon_edit_screen.dart
outputs:
  - .stitch/designs/beacon-edit/widgets.jsonl
checks:
  - id: widgets-json-exists
    description: widgets.jsonl exists for beacon-edit
    cmd: test -f .stitch/designs/beacon-edit/widgets.jsonl
plan:
vars:
  prefix: 004
  screenId: beacon-edit
  title: Edit Beacon
  widgetName: BeaconEdit
  snakeName: beacon_edit
  route: "/beacon/:id/edit"
  screenPath: lib/screens/beacon_edit/beacon_edit_screen.dart
  widgetsJsonPath: .stitch/designs/beacon-edit/widgets.jsonl
  localWidgetsDir: lib/screens/beacon_edit/widgets
  screenTaskId: 004-beacon-edit
  specPath: .stitch/designs/beacon-edit/SPEC.md
  metaPath: .stitch/designs/beacon-edit/META.md
  designPath: .stitch/designs/beacon-edit/design.html
  prevScreenLastId: 003-06-lift
  htmlReference: 
  htmlReferenceInput: 
---

# Analyze: Edit Beacon

Analyze the screen widget and identify extractable widget regions.

## Input
- `lib/screens/beacon_edit/beacon_edit_screen.dart` — The screen widget file

## Task

Read the screen file and identify widget subtrees that should be extracted into separate widget files.

Write `.stitch/designs/beacon-edit/widgets.jsonl` with one JSON object per line (JSONL format):

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

- `.stitch/designs/beacon-edit/widgets.jsonl` exists with valid JSONL
- Each entry has: name, grep, description, shared
- Widget names use PascalCase
