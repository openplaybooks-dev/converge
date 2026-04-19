---
id: 005-04-analyze
title: "Analyze: Mindfulness"
description: Identify extractable widget regions in Mindfulness
dependencies:
  - 005-03-convert
tags:
  - analyze
  - screen-mindfulness
inputs:
  - lib/screens/mindfulness/mindfulness_screen.dart
outputs:
  - .stitch/designs/mindfulness/widgets.jsonl
checks:
  - id: widgets-json-exists
    description: widgets.jsonl exists for mindfulness
    cmd: test -f .stitch/designs/mindfulness/widgets.jsonl
plan:
vars:
  prefix: 005
  screenId: mindfulness
  title: Mindfulness
  widgetName: Mindfulness
  snakeName: mindfulness
  route: /mindfulness
  screenPath: lib/screens/mindfulness/mindfulness_screen.dart
  widgetsJsonPath: .stitch/designs/mindfulness/widgets.jsonl
  localWidgetsDir: lib/screens/mindfulness/widgets
  screenTaskId: 005-mindfulness
  specPath: .stitch/designs/mindfulness/SPEC.md
  metaPath: .stitch/designs/mindfulness/META.md
  designPath: .stitch/designs/mindfulness/design.html
  prevScreenLastId: 004-06-lift
---

# Analyze: Mindfulness

Analyze the screen widget and identify extractable widget regions.

## Input
- `lib/screens/mindfulness/mindfulness_screen.dart` — The screen widget file

## Task

Read the screen file and identify widget subtrees that should be extracted into separate widget files.

Write `.stitch/designs/mindfulness/widgets.jsonl` with one JSON object per line (JSONL format):

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

- `.stitch/designs/mindfulness/widgets.jsonl` exists with valid JSONL
- Each entry has: name, grep, description, shared
- Widget names use PascalCase
