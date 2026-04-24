---
id: 007-04-analyze
title: "Analyze: Edit Safe Zone"
description: Identify extractable widget regions in Edit Safe Zone
dependencies:
  - 007-03-convert
tags:
  - analyze
  - screen-edit-safe-zone
inputs:
  - lib/screens/edit_safe_zone/edit_safe_zone_screen.dart
outputs:
  - .stitch/designs/edit-safe-zone/widgets.jsonl
checks:
  - id: widgets-json-exists
    description: widgets.jsonl exists for edit-safe-zone
    cmd: test -f .stitch/designs/edit-safe-zone/widgets.jsonl
plan:
vars:
  prefix: 007
  screenId: edit-safe-zone
  title: Edit Safe Zone
  widgetName: EditSafeZone
  snakeName: edit_safe_zone
  route: "/safe-zones/:id/edit"
  screenPath: lib/screens/edit_safe_zone/edit_safe_zone_screen.dart
  widgetsJsonPath: .stitch/designs/edit-safe-zone/widgets.jsonl
  localWidgetsDir: lib/screens/edit_safe_zone/widgets
  screenTaskId: 007-edit-safe-zone
  specPath: .stitch/designs/edit-safe-zone/SPEC.md
  metaPath: .stitch/designs/edit-safe-zone/META.md
  designPath: .stitch/designs/edit-safe-zone/design.html
  prevScreenLastId: 006-06-lift
  htmlReference: 
  htmlReferenceInput: 
---

# Analyze: Edit Safe Zone

Analyze the screen widget and identify extractable widget regions.

## Input
- `lib/screens/edit_safe_zone/edit_safe_zone_screen.dart` — The screen widget file

## Task

Read the screen file and identify widget subtrees that should be extracted into separate widget files.

Write `.stitch/designs/edit-safe-zone/widgets.jsonl` with one JSON object per line (JSONL format):

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

- `.stitch/designs/edit-safe-zone/widgets.jsonl` exists with valid JSONL
- Each entry has: name, grep, description, shared
- Widget names use PascalCase
