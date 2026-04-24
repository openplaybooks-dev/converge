---
id: 010-04-analyze
title: "Analyze: Co-Guardians"
description: Identify extractable widget regions in Co-Guardians
dependencies:
  - 010-03-convert
tags:
  - analyze
  - screen-guardians
inputs:
  - lib/screens/guardians/guardians_screen.dart
outputs:
  - .stitch/designs/guardians/widgets.jsonl
checks:
  - id: widgets-json-exists
    description: widgets.jsonl exists for guardians
    cmd: test -f .stitch/designs/guardians/widgets.jsonl
plan:
vars:
  prefix: 010
  screenId: guardians
  title: Co-Guardians
  widgetName: Guardians
  snakeName: guardians
  route: /guardians
  screenPath: lib/screens/guardians/guardians_screen.dart
  widgetsJsonPath: .stitch/designs/guardians/widgets.jsonl
  localWidgetsDir: lib/screens/guardians/widgets
  screenTaskId: 010-guardians
  specPath: .stitch/designs/guardians/SPEC.md
  metaPath: .stitch/designs/guardians/META.md
  designPath: .stitch/designs/guardians/design.html
  prevScreenLastId: 009-06-lift
  htmlReference: .stitch/references/ch_p_nh_n_l_i_m_i/code.html
  htmlReferenceInput: "  - \".stitch/references/ch_p_nh_n_l_i_m_i/code.html\"\n"
---

# Analyze: Co-Guardians

Analyze the screen widget and identify extractable widget regions.

## Input
- `lib/screens/guardians/guardians_screen.dart` — The screen widget file

## Task

Read the screen file and identify widget subtrees that should be extracted into separate widget files.

Write `.stitch/designs/guardians/widgets.jsonl` with one JSON object per line (JSONL format):

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

- `.stitch/designs/guardians/widgets.jsonl` exists with valid JSONL
- Each entry has: name, grep, description, shared
- Widget names use PascalCase
