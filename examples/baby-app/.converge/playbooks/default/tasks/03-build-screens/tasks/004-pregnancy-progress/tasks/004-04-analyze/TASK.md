---
id: 004-04-analyze
title: "Analyze: Pregnancy Progress"
description: Identify extractable widget regions in Pregnancy Progress
dependencies:
  - 004-03-convert
tags:
  - analyze
  - screen-pregnancy-progress
inputs:
  - lib/screens/pregnancy_progress/pregnancy_progress_screen.dart
outputs:
  - .stitch/designs/pregnancy-progress/widgets.jsonl
checks:
  - id: widgets-json-exists
    description: widgets.jsonl exists for pregnancy-progress
    cmd: test -f .stitch/designs/pregnancy-progress/widgets.jsonl
plan:
vars:
  prefix: 004
  screenId: pregnancy-progress
  title: Pregnancy Progress
  widgetName: PregnancyProgress
  snakeName: pregnancy_progress
  route: /progress
  screenPath: lib/screens/pregnancy_progress/pregnancy_progress_screen.dart
  widgetsJsonPath: .stitch/designs/pregnancy-progress/widgets.jsonl
  localWidgetsDir: lib/screens/pregnancy_progress/widgets
  screenTaskId: 004-pregnancy-progress
  specPath: .stitch/designs/pregnancy-progress/SPEC.md
  metaPath: .stitch/designs/pregnancy-progress/META.md
  designPath: .stitch/designs/pregnancy-progress/design.html
  prevScreenLastId: 003-06-lift
---

# Analyze: Pregnancy Progress

Analyze the screen widget and identify extractable widget regions.

## Input
- `lib/screens/pregnancy_progress/pregnancy_progress_screen.dart` — The screen widget file

## Task

Read the screen file and identify widget subtrees that should be extracted into separate widget files.

Write `.stitch/designs/pregnancy-progress/widgets.jsonl` with one JSON object per line (JSONL format):

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

- `.stitch/designs/pregnancy-progress/widgets.jsonl` exists with valid JSONL
- Each entry has: name, grep, description, shared
- Widget names use PascalCase
