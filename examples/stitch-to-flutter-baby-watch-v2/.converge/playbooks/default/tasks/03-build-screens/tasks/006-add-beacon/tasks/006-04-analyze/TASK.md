---
id: 006-04-analyze
title: "Analyze: Add Beacon"
description: Identify extractable widget regions in Add Beacon
dependencies:
  - 006-03-convert
tags:
  - analyze
  - screen-add-beacon
inputs:
  - lib/screens/add_beacon/add_beacon_screen.dart
outputs:
  - .stitch/designs/add-beacon/widgets.jsonl
checks:
  - id: widgets-json-exists
    description: widgets.jsonl exists for add-beacon
    cmd: test -f .stitch/designs/add-beacon/widgets.jsonl
plan:
vars:
  prefix: 006
  screenId: add-beacon
  title: Add Beacon
  widgetName: AddBeacon
  snakeName: add_beacon
  route: /devices/add
  screenPath: lib/screens/add_beacon/add_beacon_screen.dart
  widgetsJsonPath: .stitch/designs/add-beacon/widgets.jsonl
  localWidgetsDir: lib/screens/add_beacon/widgets
  screenTaskId: 006-add-beacon
  specPath: .stitch/designs/add-beacon/SPEC.md
  metaPath: .stitch/designs/add-beacon/META.md
  designPath: .stitch/designs/add-beacon/design.html
  linkedHtmlPath: .stitch/designs/add-beacon/code.html
  statesPath: lib/screens/add_beacon/add_beacon_states.dart
  htmlReference: .stitch/references/th_m_beacon_phase_2/code.html
  htmlReferenceInput: "  - \".stitch/references/th_m_beacon_phase_2/code.html\"\n"
  screenshotReference: .stitch/references/th_m_beacon_phase_2/screen.png
  screenshotReferenceInput: "  - \".stitch/references/th_m_beacon_phase_2/screen.png\"\n"
  prevScreenLastId: 005-07-states
  variant: 
  variantGroup: 
---

# Analyze: Add Beacon

Analyze the screen widget and identify extractable widget regions.

## Input
- `lib/screens/add_beacon/add_beacon_screen.dart` — The screen widget file

## Task

Read the screen file and identify widget subtrees that should be extracted into separate widget files.

Write `.stitch/designs/add-beacon/widgets.jsonl` with one JSON object per line (JSONL format):

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

- `.stitch/designs/add-beacon/widgets.jsonl` exists with valid JSONL
- Each entry has: name, grep, description, shared
- Widget names use PascalCase
