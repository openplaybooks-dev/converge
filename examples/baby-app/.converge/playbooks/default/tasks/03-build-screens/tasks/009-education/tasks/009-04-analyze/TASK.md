---
id: 009-04-analyze
title: "Analyze: Education"
description: Identify extractable widget regions in Education
dependencies:
  - 009-03-convert
tags:
  - analyze
  - screen-education
inputs:
  - lib/screens/education/education_screen.dart
outputs:
  - .stitch/designs/education/widgets.jsonl
checks:
  - id: widgets-json-exists
    description: widgets.jsonl exists for education
    cmd: test -f .stitch/designs/education/widgets.jsonl
plan:
vars:
  prefix: 009
  screenId: education
  title: Education
  widgetName: Education
  snakeName: education
  route: /education
  screenPath: lib/screens/education/education_screen.dart
  widgetsJsonPath: .stitch/designs/education/widgets.jsonl
  localWidgetsDir: lib/screens/education/widgets
  screenTaskId: 009-education
  specPath: .stitch/designs/education/SPEC.md
  metaPath: .stitch/designs/education/META.md
  designPath: .stitch/designs/education/design.html
  prevScreenLastId: 008-06-lift
---

# Analyze: Education

Analyze the screen widget and identify extractable widget regions.

## Input
- `lib/screens/education/education_screen.dart` — The screen widget file

## Task

Read the screen file and identify widget subtrees that should be extracted into separate widget files.

Write `.stitch/designs/education/widgets.jsonl` with one JSON object per line (JSONL format):

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

- `.stitch/designs/education/widgets.jsonl` exists with valid JSONL
- Each entry has: name, grep, description, shared
- Widget names use PascalCase
