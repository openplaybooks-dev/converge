---
id: 008-04-analyze
title: "Analyze: Mood & Wellness"
description: "Identify extractable widget regions in Mood & Wellness"
dependencies:
  - 008-03-convert
tags:
  - analyze
  - screen-mood-wellness
inputs:
  - lib/screens/mood_wellness/mood_wellness_screen.dart
outputs:
  - .stitch/designs/mood-wellness/widgets.jsonl
checks:
  - id: widgets-json-exists
    description: widgets.jsonl exists for mood-wellness
    cmd: test -f .stitch/designs/mood-wellness/widgets.jsonl
plan:
vars:
  prefix: 008
  screenId: mood-wellness
  title: "Mood & Wellness"
  widgetName: MoodWellness
  snakeName: mood_wellness
  route: /mood
  screenPath: lib/screens/mood_wellness/mood_wellness_screen.dart
  widgetsJsonPath: .stitch/designs/mood-wellness/widgets.jsonl
  localWidgetsDir: lib/screens/mood_wellness/widgets
  screenTaskId: 008-mood-wellness
  specPath: .stitch/designs/mood-wellness/SPEC.md
  metaPath: .stitch/designs/mood-wellness/META.md
  designPath: .stitch/designs/mood-wellness/design.html
  prevScreenLastId: 007-06-lift
---

# Analyze: Mood & Wellness

Analyze the screen widget and identify extractable widget regions.

## Input
- `lib/screens/mood_wellness/mood_wellness_screen.dart` — The screen widget file

## Task

Read the screen file and identify widget subtrees that should be extracted into separate widget files.

Write `.stitch/designs/mood-wellness/widgets.jsonl` with one JSON object per line (JSONL format):

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

- `.stitch/designs/mood-wellness/widgets.jsonl` exists with valid JSONL
- Each entry has: name, grep, description, shared
- Widget names use PascalCase
