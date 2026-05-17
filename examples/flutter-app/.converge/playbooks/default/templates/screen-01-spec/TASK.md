---
title: "Spec: {{title}}"
description: "Generate {{title}} screen specification"
plan: true
references:
  - flutter-building-layouts
tags:
  - spec
  - screen-{{screenId}}
vars:
  screenId:
  title:
  route:
  widgetName:
  specPath:
inputs:
  - .stitch/system/DESIGN.md
  - .stitch/UX.md
  - .stitch/screens.json
outputs:
  - "{{specPath}}"
checks:
  - id: spec-exists
    cmd: "test -f {{specPath}}"
    description: "SPEC.md exists for {{screenId}}"
  - id: spec-has-content
    cmd: "test $(wc -l < {{specPath}}) -gt 50"
    description: "SPEC.md has >50 lines"
---

# Spec: {{title}}

Generate the screen specification for **{{title}}** (`{{route}}`).

## Inputs
- `.stitch/system/DESIGN.md` — Design system
- `.stitch/UX.md` — UX overview
- `.stitch/screens.json` — Screen definitions

## Task

Read inputs and produce `{{specPath}}` containing:

1. **Screen Title** — {{title}}
2. **Purpose** — What this screen does and why
3. **Route** — `{{route}}`
4. **Widget Name** — `{{widgetName}}Screen`
5. **Design Tokens** — Colors, typography, spacing from DESIGN.md
6. **Layout Rules** — Scaffold structure, app bar, body, bottom nav
7. **Sections** — Each visual section with:
   - Description of content
   - Widget type (ListView, GridView, Column, etc.)
   - Data requirements
   - Interactive elements
8. **Data** — Entities and fields displayed on this screen
9. **Motion** — Entry animations, transitions, hero animations
10. **Accessibility** — Semantics labels, focus order, contrast notes
11. **Anti-Patterns** — Things to avoid

## Success Criteria

- `{{specPath}}` exists and has >50 lines
- All required sections present
- Design tokens reference DESIGN.md values
