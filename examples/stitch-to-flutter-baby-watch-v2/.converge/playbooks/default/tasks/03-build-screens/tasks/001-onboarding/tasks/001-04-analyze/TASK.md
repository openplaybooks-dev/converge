---
id: 001-04-analyze
title: "Analyze: Onboarding"
description: Identify extractable widget regions in Onboarding
dependencies:
  - 001-03-convert
tags:
  - analyze
  - screen-onboarding
inputs:
  - lib/screens/onboarding/onboarding_screen.dart
outputs:
  - .stitch/designs/onboarding/widgets.jsonl
checks:
  - id: widgets-json-exists
    description: widgets.jsonl exists for onboarding
    cmd: test -f .stitch/designs/onboarding/widgets.jsonl
plan:
vars:
  prefix: 001
  screenId: onboarding
  title: Onboarding
  widgetName: Onboarding
  snakeName: onboarding
  route: /onboarding
  screenPath: lib/screens/onboarding/onboarding_screen.dart
  widgetsJsonPath: .stitch/designs/onboarding/widgets.jsonl
  localWidgetsDir: lib/screens/onboarding/widgets
  screenTaskId: 001-onboarding
  specPath: .stitch/designs/onboarding/SPEC.md
  metaPath: .stitch/designs/onboarding/META.md
  designPath: .stitch/designs/onboarding/design.html
  linkedHtmlPath: .stitch/designs/onboarding/code.html
  statesPath: lib/screens/onboarding/onboarding_states.dart
  htmlReference: .stitch/references/babyguard_onboarding_phase_2/code.html
  htmlReferenceInput: "  - \".stitch/references/babyguard_onboarding_phase_2/code.html\"\n"
  screenshotReference: .stitch/references/babyguard_onboarding_phase_2/screen.png
  screenshotReferenceInput: "  - \".stitch/references/babyguard_onboarding_phase_2/screen.png\"\n"
  prevScreenLastId: 
  variant: 
  variantGroup: 
---

# Analyze: Onboarding

Analyze the screen widget and identify extractable widget regions.

## Input
- `lib/screens/onboarding/onboarding_screen.dart` — The screen widget file

## Task

Read the screen file and identify widget subtrees that should be extracted into separate widget files.

Write `.stitch/designs/onboarding/widgets.jsonl` with one JSON object per line (JSONL format):

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

- `.stitch/designs/onboarding/widgets.jsonl` exists with valid JSONL
- Each entry has: name, grep, description, shared
- Widget names use PascalCase
