---
id: 008-04-analyze
title: "Analyze: Safe Zones"
description: Identify extractable widget regions in Safe Zones
dependencies:
  - 008-03-convert
tags:
  - analyze
  - screen-safe-zones
inputs:
  - lib/screens/safe_zones/safe_zones_screen.dart
outputs:
  - .stitch/designs/safe-zones/widgets.jsonl
checks:
  - id: widgets-json-exists
    description: widgets.jsonl exists for safe-zones
    cmd: test -f .stitch/designs/safe-zones/widgets.jsonl
plan:
vars:
  prefix: 008
  screenId: safe-zones
  title: Safe Zones
  widgetName: SafeZones
  snakeName: safe_zones
  route: /security
  screenPath: lib/screens/safe_zones/safe_zones_screen.dart
  widgetsJsonPath: .stitch/designs/safe-zones/widgets.jsonl
  localWidgetsDir: lib/screens/safe_zones/widgets
  screenTaskId: 008-safe-zones
  specPath: .stitch/designs/safe-zones/SPEC.md
  metaPath: .stitch/designs/safe-zones/META.md
  designPath: .stitch/designs/safe-zones/design.html
  linkedHtmlPath: .stitch/designs/safe-zones/code.html
  statesPath: lib/screens/safe_zones/safe_zones_states.dart
  htmlReference: .stitch/references/safe_zones/code.html
  htmlReferenceInput: "  - \".stitch/references/safe_zones/code.html\"\n"
  screenshotReference: .stitch/references/safe_zones/screen.png
  screenshotReferenceInput: "  - \".stitch/references/safe_zones/screen.png\"\n"
  prevScreenLastId: 007-07-states
  variant: 
  variantGroup: 
---

# Analyze: Safe Zones

Analyze the screen widget and identify extractable widget regions.

## Input
- `lib/screens/safe_zones/safe_zones_screen.dart` — The screen widget file

## Task

Read the screen file and identify widget subtrees that should be extracted into separate widget files.

Write `.stitch/designs/safe-zones/widgets.jsonl` with one JSON object per line (JSONL format):

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

- `.stitch/designs/safe-zones/widgets.jsonl` exists with valid JSONL
- Each entry has: name, grep, description, shared
- Widget names use PascalCase
