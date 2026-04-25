---
id: 003-04-analyze
title: "Analyze: Home — Weak Signal"
description: Identify extractable widget regions in Home — Weak Signal
dependencies:
  - 003-03-convert
tags:
  - analyze
  - screen-home-weak
inputs:
  - lib/screens/home_weak/home_weak_screen.dart
outputs:
  - .stitch/designs/home-weak/widgets.jsonl
checks:
  - id: widgets-json-exists
    description: widgets.jsonl exists for home-weak
    cmd: test -f .stitch/designs/home-weak/widgets.jsonl
plan:
vars:
  prefix: 003
  screenId: home-weak
  title: Home — Weak Signal
  widgetName: HomeWeak
  snakeName: home_weak
  route: /home
  screenPath: lib/screens/home_weak/home_weak_screen.dart
  widgetsJsonPath: .stitch/designs/home-weak/widgets.jsonl
  localWidgetsDir: lib/screens/home_weak/widgets
  screenTaskId: 003-home-weak
  specPath: .stitch/designs/home-weak/SPEC.md
  metaPath: .stitch/designs/home-weak/META.md
  designPath: .stitch/designs/home-weak/design.html
  linkedHtmlPath: .stitch/designs/home-weak/code.html
  statesPath: lib/screens/home_weak/home_weak_states.dart
  htmlReference: .stitch/references/babyguard_home_phase_2_weak_signal/code.html
  htmlReferenceInput: "  - \".stitch/references/babyguard_home_phase_2_weak_signal/code.html\"\n"
  screenshotReference: .stitch/references/babyguard_home_phase_2_weak_signal/screen.png
  screenshotReferenceInput: "  - \".stitch/references/babyguard_home_phase_2_weak_signal/screen.png\"\n"
  prevScreenLastId: 002-07-states
  variant: weak
  variantGroup: home
---

# Analyze: Home — Weak Signal

Analyze the screen widget and identify extractable widget regions.

## Input
- `lib/screens/home_weak/home_weak_screen.dart` — The screen widget file

## Task

Read the screen file and identify widget subtrees that should be extracted into separate widget files.

Write `.stitch/designs/home-weak/widgets.jsonl` with one JSON object per line (JSONL format):

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

- `.stitch/designs/home-weak/widgets.jsonl` exists with valid JSONL
- Each entry has: name, grep, description, shared
- Widget names use PascalCase
