---
id: 003-04-analyze
title: "Analyze: Weight & Nutrition"
description: "Identify extractable widget regions in Weight & Nutrition"
dependencies:
  - 003-03-convert
tags:
  - analyze
  - screen-weight-nutrition
inputs:
  - lib/screens/weight_nutrition/weight_nutrition_screen.dart
outputs:
  - .stitch/designs/weight-nutrition/widgets.jsonl
checks:
  - id: widgets-json-exists
    description: widgets.jsonl exists for weight-nutrition
    cmd: test -f .stitch/designs/weight-nutrition/widgets.jsonl
plan:
vars:
  prefix: 003
  screenId: weight-nutrition
  title: "Weight & Nutrition"
  widgetName: WeightNutrition
  snakeName: weight_nutrition
  route: /weight
  screenPath: lib/screens/weight_nutrition/weight_nutrition_screen.dart
  widgetsJsonPath: .stitch/designs/weight-nutrition/widgets.jsonl
  localWidgetsDir: lib/screens/weight_nutrition/widgets
  screenTaskId: 003-weight-nutrition
  specPath: .stitch/designs/weight-nutrition/SPEC.md
  metaPath: .stitch/designs/weight-nutrition/META.md
  designPath: .stitch/designs/weight-nutrition/design.html
  prevScreenLastId: 002-06-lift
---

# Analyze: Weight & Nutrition

Analyze the screen widget and identify extractable widget regions.

## Input
- `lib/screens/weight_nutrition/weight_nutrition_screen.dart` — The screen widget file

## Task

Read the screen file and identify widget subtrees that should be extracted into separate widget files.

Write `.stitch/designs/weight-nutrition/widgets.jsonl` with one JSON object per line (JSONL format):

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

- `.stitch/designs/weight-nutrition/widgets.jsonl` exists with valid JSONL
- Each entry has: name, grep, description, shared
- Widget names use PascalCase
