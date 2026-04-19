---
id: 006-04-analyze
title: "Analyze: Exercise Detail"
description: Identify extractable widget regions in Exercise Detail
dependencies:
  - 006-03-convert
tags:
  - analyze
  - screen-exercise-detail
inputs:
  - lib/screens/exercise_detail/exercise_detail_screen.dart
outputs:
  - .stitch/designs/exercise-detail/widgets.jsonl
checks:
  - id: widgets-json-exists
    description: widgets.jsonl exists for exercise-detail
    cmd: test -f .stitch/designs/exercise-detail/widgets.jsonl
plan:
vars:
  prefix: 006
  screenId: exercise-detail
  title: Exercise Detail
  widgetName: ExerciseDetail
  snakeName: exercise_detail
  route: "/mindfulness/exercise/:id"
  screenPath: lib/screens/exercise_detail/exercise_detail_screen.dart
  widgetsJsonPath: .stitch/designs/exercise-detail/widgets.jsonl
  localWidgetsDir: lib/screens/exercise_detail/widgets
  screenTaskId: 006-exercise-detail
  specPath: .stitch/designs/exercise-detail/SPEC.md
  metaPath: .stitch/designs/exercise-detail/META.md
  designPath: .stitch/designs/exercise-detail/design.html
  prevScreenLastId: 005-06-lift
---

# Analyze: Exercise Detail

Analyze the screen widget and identify extractable widget regions.

## Input
- `lib/screens/exercise_detail/exercise_detail_screen.dart` — The screen widget file

## Task

Read the screen file and identify widget subtrees that should be extracted into separate widget files.

Write `.stitch/designs/exercise-detail/widgets.jsonl` with one JSON object per line (JSONL format):

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

- `.stitch/designs/exercise-detail/widgets.jsonl` exists with valid JSONL
- Each entry has: name, grep, description, shared
- Widget names use PascalCase
