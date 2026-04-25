---
id: 004-04-analyze
title: "Analyze: Home — Alert"
description: Identify extractable widget regions in Home — Alert
dependencies:
  - 004-03-convert
tags:
  - analyze
  - screen-home-alert
inputs:
  - lib/screens/home_alert/home_alert_screen.dart
outputs:
  - .stitch/designs/home-alert/widgets.jsonl
checks:
  - id: widgets-json-exists
    description: widgets.jsonl exists for home-alert
    cmd: test -f .stitch/designs/home-alert/widgets.jsonl
plan:
vars:
  prefix: 004
  screenId: home-alert
  title: Home — Alert
  widgetName: HomeAlert
  snakeName: home_alert
  route: /home
  screenPath: lib/screens/home_alert/home_alert_screen.dart
  widgetsJsonPath: .stitch/designs/home-alert/widgets.jsonl
  localWidgetsDir: lib/screens/home_alert/widgets
  screenTaskId: 004-home-alert
  specPath: .stitch/designs/home-alert/SPEC.md
  metaPath: .stitch/designs/home-alert/META.md
  designPath: .stitch/designs/home-alert/design.html
  linkedHtmlPath: .stitch/designs/home-alert/code.html
  statesPath: lib/screens/home_alert/home_alert_states.dart
  htmlReference: .stitch/references/babyguard_home_phase_2_alert/code.html
  htmlReferenceInput: "  - \".stitch/references/babyguard_home_phase_2_alert/code.html\"\n"
  screenshotReference: .stitch/references/babyguard_home_phase_2_alert/screen.png
  screenshotReferenceInput: "  - \".stitch/references/babyguard_home_phase_2_alert/screen.png\"\n"
  prevScreenLastId: 003-07-states
  variant: alert
  variantGroup: home
---

# Analyze: Home — Alert

Analyze the screen widget and identify extractable widget regions.

## Input
- `lib/screens/home_alert/home_alert_screen.dart` — The screen widget file

## Task

Read the screen file and identify widget subtrees that should be extracted into separate widget files.

Write `.stitch/designs/home-alert/widgets.jsonl` with one JSON object per line (JSONL format):

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

- `.stitch/designs/home-alert/widgets.jsonl` exists with valid JSONL
- Each entry has: name, grep, description, shared
- Widget names use PascalCase
