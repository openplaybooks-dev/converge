---
id: 003-04-analyze
title: "Analyze: Beacon Detail"
description: Identify extractable widget regions in Beacon Detail
dependencies:
  - 003-03-convert
tags:
  - analyze
  - screen-beacon-detail
inputs:
  - lib/screens/beacon_detail/beacon_detail_screen.dart
outputs:
  - .stitch/designs/beacon-detail/widgets.jsonl
checks:
  - id: widgets-json-exists
    description: widgets.jsonl exists for beacon-detail
    cmd: test -f .stitch/designs/beacon-detail/widgets.jsonl
plan:
vars:
  prefix: 003
  screenId: beacon-detail
  title: Beacon Detail
  widgetName: BeaconDetail
  snakeName: beacon_detail
  route: "/beacon/:id"
  screenPath: lib/screens/beacon_detail/beacon_detail_screen.dart
  widgetsJsonPath: .stitch/designs/beacon-detail/widgets.jsonl
  localWidgetsDir: lib/screens/beacon_detail/widgets
  screenTaskId: 003-beacon-detail
  specPath: .stitch/designs/beacon-detail/SPEC.md
  metaPath: .stitch/designs/beacon-detail/META.md
  designPath: .stitch/designs/beacon-detail/design.html
  prevScreenLastId: 002-06-lift
  htmlReference: .stitch/references/chi_ti_t_beacon_phase_2/code.html
  htmlReferenceInput: "  - \".stitch/references/chi_ti_t_beacon_phase_2/code.html\"\n"
---

# Analyze: Beacon Detail

Analyze the screen widget and identify extractable widget regions.

## Input
- `lib/screens/beacon_detail/beacon_detail_screen.dart` — The screen widget file

## Task

Read the screen file and identify widget subtrees that should be extracted into separate widget files.

Write `.stitch/designs/beacon-detail/widgets.jsonl` with one JSON object per line (JSONL format):

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

- `.stitch/designs/beacon-detail/widgets.jsonl` exists with valid JSONL
- Each entry has: name, grep, description, shared
- Widget names use PascalCase
