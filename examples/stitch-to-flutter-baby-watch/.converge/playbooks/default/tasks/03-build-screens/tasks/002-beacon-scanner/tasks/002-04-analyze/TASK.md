---
id: 002-04-analyze
title: "Analyze: Beacon Scanner"
description: Identify extractable widget regions in Beacon Scanner
dependencies:
  - 002-03-convert
tags:
  - analyze
  - screen-beacon-scanner
inputs:
  - lib/screens/beacon_scanner/beacon_scanner_screen.dart
outputs:
  - .stitch/designs/beacon-scanner/widgets.jsonl
checks:
  - id: widgets-json-exists
    description: widgets.jsonl exists for beacon-scanner
    cmd: test -f .stitch/designs/beacon-scanner/widgets.jsonl
plan:
vars:
  prefix: 002
  screenId: beacon-scanner
  title: Beacon Scanner
  widgetName: BeaconScanner
  snakeName: beacon_scanner
  route: /scan
  screenPath: lib/screens/beacon_scanner/beacon_scanner_screen.dart
  widgetsJsonPath: .stitch/designs/beacon-scanner/widgets.jsonl
  localWidgetsDir: lib/screens/beacon_scanner/widgets
  screenTaskId: 002-beacon-scanner
  specPath: .stitch/designs/beacon-scanner/SPEC.md
  metaPath: .stitch/designs/beacon-scanner/META.md
  designPath: .stitch/designs/beacon-scanner/design.html
  prevScreenLastId: 001-06-lift
  htmlReference: .stitch/references/th_m_beacon_phase_2/code.html
  htmlReferenceInput: "  - \".stitch/references/th_m_beacon_phase_2/code.html\"\n"
---

# Analyze: Beacon Scanner

Analyze the screen widget and identify extractable widget regions.

## Input
- `lib/screens/beacon_scanner/beacon_scanner_screen.dart` — The screen widget file

## Task

Read the screen file and identify widget subtrees that should be extracted into separate widget files.

Write `.stitch/designs/beacon-scanner/widgets.jsonl` with one JSON object per line (JSONL format):

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

- `.stitch/designs/beacon-scanner/widgets.jsonl` exists with valid JSONL
- Each entry has: name, grep, description, shared
- Widget names use PascalCase
