---
id: 002-04-analyze
title: "Analyze: Cycle Tracking"
description: Identify extractable widget regions in Cycle Tracking
dependencies:
  - 002-03-convert
tags:
  - analyze
  - screen-cycle-tracking
inputs:
  - lib/screens/cycle_tracking/cycle_tracking_screen.dart
outputs:
  - .stitch/designs/cycle-tracking/widgets.jsonl
checks:
  - id: widgets-json-exists
    description: widgets.jsonl exists for cycle-tracking
    cmd: test -f .stitch/designs/cycle-tracking/widgets.jsonl
plan:
vars:
  prefix: 002
  screenId: cycle-tracking
  title: Cycle Tracking
  widgetName: CycleTracking
  snakeName: cycle_tracking
  route: /cycle
  screenPath: lib/screens/cycle_tracking/cycle_tracking_screen.dart
  widgetsJsonPath: .stitch/designs/cycle-tracking/widgets.jsonl
  localWidgetsDir: lib/screens/cycle_tracking/widgets
  screenTaskId: 002-cycle-tracking
  specPath: .stitch/designs/cycle-tracking/SPEC.md
  metaPath: .stitch/designs/cycle-tracking/META.md
  designPath: .stitch/designs/cycle-tracking/design.html
  prevScreenLastId: 001-06-lift
---

# Analyze: Cycle Tracking

Analyze the screen widget and identify extractable widget regions.

## Input
- `lib/screens/cycle_tracking/cycle_tracking_screen.dart` — The screen widget file

## Task

Read the screen file and identify widget subtrees that should be extracted into separate widget files.

Write `.stitch/designs/cycle-tracking/widgets.jsonl` with one JSON object per line (JSONL format):

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

- `.stitch/designs/cycle-tracking/widgets.jsonl` exists with valid JSONL
- Each entry has: name, grep, description, shared
- Widget names use PascalCase
