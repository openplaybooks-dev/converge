---
id: 008-04-analyze
title: "Analyze: History"
description: Identify extractable widget regions in History
dependencies:
  - 008-03-convert
tags:
  - analyze
  - screen-history
inputs:
  - lib/screens/history/history_screen.dart
outputs:
  - .stitch/designs/history/widgets.jsonl
checks:
  - id: widgets-json-exists
    description: widgets.jsonl exists for history
    cmd: test -f .stitch/designs/history/widgets.jsonl
plan:
vars:
  prefix: 008
  screenId: history
  title: History
  widgetName: History
  snakeName: history
  route: /history
  screenPath: lib/screens/history/history_screen.dart
  widgetsJsonPath: .stitch/designs/history/widgets.jsonl
  localWidgetsDir: lib/screens/history/widgets
  screenTaskId: 008-history
  specPath: .stitch/designs/history/SPEC.md
  metaPath: .stitch/designs/history/META.md
  designPath: .stitch/designs/history/design.html
  prevScreenLastId: 007-06-lift
  htmlReference: .stitch/references/history/code.html
  htmlReferenceInput: "  - \".stitch/references/history/code.html\"\n"
---

# Analyze: History

Analyze the screen widget and identify extractable widget regions.

## Input
- `lib/screens/history/history_screen.dart` — The screen widget file

## Task

Read the screen file and identify widget subtrees that should be extracted into separate widget files.

Write `.stitch/designs/history/widgets.jsonl` with one JSON object per line (JSONL format):

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

- `.stitch/designs/history/widgets.jsonl` exists with valid JSONL
- Each entry has: name, grep, description, shared
- Widget names use PascalCase
