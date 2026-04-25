---
id: 007-04-analyze
title: "Analyze: Co-guardians"
description: Identify extractable widget regions in Co-guardians
dependencies:
  - 007-03-convert
tags:
  - analyze
  - screen-co-guardians-list
inputs:
  - lib/screens/co_guardians_list/co_guardians_list_screen.dart
outputs:
  - .stitch/designs/co-guardians-list/widgets.jsonl
checks:
  - id: widgets-json-exists
    description: widgets.jsonl exists for co-guardians-list
    cmd: test -f .stitch/designs/co-guardians-list/widgets.jsonl
plan:
vars:
  prefix: 007
  screenId: co-guardians-list
  title: Co-guardians
  widgetName: CoGuardiansList
  snakeName: co_guardians_list
  route: /devices/co-guardians
  screenPath: lib/screens/co_guardians_list/co_guardians_list_screen.dart
  widgetsJsonPath: .stitch/designs/co-guardians-list/widgets.jsonl
  localWidgetsDir: lib/screens/co_guardians_list/widgets
  screenTaskId: 007-co-guardians-list
  specPath: .stitch/designs/co-guardians-list/SPEC.md
  metaPath: .stitch/designs/co-guardians-list/META.md
  designPath: .stitch/designs/co-guardians-list/design.html
  linkedHtmlPath: .stitch/designs/co-guardians-list/code.html
  statesPath: lib/screens/co_guardians_list/co_guardians_list_states.dart
  htmlReference: .stitch/references/ch_p_nh_n_l_i_m_i/code.html
  htmlReferenceInput: "  - \".stitch/references/ch_p_nh_n_l_i_m_i/code.html\"\n"
  screenshotReference: .stitch/references/ch_p_nh_n_l_i_m_i/screen.png
  screenshotReferenceInput: "  - \".stitch/references/ch_p_nh_n_l_i_m_i/screen.png\"\n"
  prevScreenLastId: 006-07-states
  variant: 
  variantGroup: 
---

# Analyze: Co-guardians

Analyze the screen widget and identify extractable widget regions.

## Input
- `lib/screens/co_guardians_list/co_guardians_list_screen.dart` — The screen widget file

## Task

Read the screen file and identify widget subtrees that should be extracted into separate widget files.

Write `.stitch/designs/co-guardians-list/widgets.jsonl` with one JSON object per line (JSONL format):

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

- `.stitch/designs/co-guardians-list/widgets.jsonl` exists with valid JSONL
- Each entry has: name, grep, description, shared
- Widget names use PascalCase
