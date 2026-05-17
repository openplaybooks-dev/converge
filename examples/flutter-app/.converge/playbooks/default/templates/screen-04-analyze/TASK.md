---
title: "Analyze: {{title}}"
description: "Identify extractable widget regions in {{title}}"
plan: true
tags:
  - analyze
  - screen-{{screenId}}
vars:
  screenId:
  title:
  screenPath:
  widgetsJsonPath:
inputs:
  - "{{screenPath}}"
outputs:
  - "{{widgetsJsonPath}}"
checks:
  - id: widgets-json-exists
    cmd: "test -f {{widgetsJsonPath}}"
    description: "widgets.jsonl exists for {{screenId}}"
---

# Analyze: {{title}}

Analyze the screen widget and identify extractable widget regions.

## Input
- `{{screenPath}}` — The screen widget file

## Task

Read the screen file and identify widget subtrees that should be extracted into separate widget files.

Write `{{widgetsJsonPath}}` with one JSON object per line (JSONL format):

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

- `{{widgetsJsonPath}}` exists with valid JSONL
- Each entry has: name, grep, description, shared
- Widget names use PascalCase
