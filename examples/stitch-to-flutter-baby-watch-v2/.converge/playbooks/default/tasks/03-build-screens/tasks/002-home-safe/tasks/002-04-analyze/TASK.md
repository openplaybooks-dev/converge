---
id: 002-04-analyze
title: "Analyze: Home — Safe"
description: Identify extractable widget regions in Home — Safe
dependencies:
  - 002-03-convert
tags:
  - analyze
  - screen-home-safe
inputs:
  - lib/screens/home_safe/home_safe_screen.dart
outputs:
  - .stitch/designs/home-safe/widgets.jsonl
checks:
  - id: widgets-json-exists
    description: widgets.jsonl exists for home-safe
    cmd: test -f .stitch/designs/home-safe/widgets.jsonl
plan:
vars:
  prefix: 002
  screenId: home-safe
  title: Home — Safe
  widgetName: HomeSafe
  snakeName: home_safe
  route: /home
  screenPath: lib/screens/home_safe/home_safe_screen.dart
  widgetsJsonPath: .stitch/designs/home-safe/widgets.jsonl
  localWidgetsDir: lib/screens/home_safe/widgets
  screenTaskId: 002-home-safe
  specPath: .stitch/designs/home-safe/SPEC.md
  metaPath: .stitch/designs/home-safe/META.md
  designPath: .stitch/designs/home-safe/design.html
  linkedHtmlPath: .stitch/designs/home-safe/code.html
  statesPath: lib/screens/home_safe/home_safe_states.dart
  htmlReference: .stitch/references/babyguard_home_phase_2_safe_updated/code.html
  htmlReferenceInput: "  - \".stitch/references/babyguard_home_phase_2_safe_updated/code.html\"\n"
  screenshotReference: .stitch/references/babyguard_home_phase_2_safe_updated/screen.png
  screenshotReferenceInput: "  - \".stitch/references/babyguard_home_phase_2_safe_updated/screen.png\"\n"
  prevScreenLastId: 001-07-states
  variant: safe
  variantGroup: home
---

# Analyze: Home — Safe

Analyze the screen widget and identify extractable widget regions.

## Input
- `lib/screens/home_safe/home_safe_screen.dart` — The screen widget file

## Task

Read the screen file and identify widget subtrees that should be extracted into separate widget files.

Write `.stitch/designs/home-safe/widgets.jsonl` with one JSON object per line (JSONL format):

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

- `.stitch/designs/home-safe/widgets.jsonl` exists with valid JSONL
- Each entry has: name, grep, description, shared
- Widget names use PascalCase
