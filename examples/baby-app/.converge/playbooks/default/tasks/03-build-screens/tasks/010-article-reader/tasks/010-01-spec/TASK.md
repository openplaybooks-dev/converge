---
id: 010-01-spec
title: "Spec: Article Reader"
description: Generate Article Reader screen specification
tags:
  - spec
  - screen-article-reader
inputs:
  - .stitch/system/DESIGN.md
  - .stitch/UX.md
  - .stitch/screens.json
outputs:
  - .stitch/designs/article-reader/SPEC.md
checks:
  - id: spec-exists
    description: SPEC.md exists for article-reader
    cmd: test -f .stitch/designs/article-reader/SPEC.md
  - id: spec-has-content
    description: "SPEC.md has >50 lines"
    cmd: test $(wc -l < .stitch/designs/article-reader/SPEC.md) -gt 50
plan:
vars:
  references: ["flutter-building-layouts"]
  prefix: 010
  screenId: article-reader
  title: Article Reader
  widgetName: ArticleReader
  snakeName: article_reader
  route: "/education/article/:id"
  screenPath: lib/screens/article_reader/article_reader_screen.dart
  widgetsJsonPath: .stitch/designs/article-reader/widgets.jsonl
  localWidgetsDir: lib/screens/article_reader/widgets
  screenTaskId: 010-article-reader
  specPath: .stitch/designs/article-reader/SPEC.md
  metaPath: .stitch/designs/article-reader/META.md
  designPath: .stitch/designs/article-reader/design.html
  prevScreenLastId: 009-06-lift
---

# Spec: Article Reader

Generate the screen specification for **Article Reader** (`/education/article/:id`).

## Inputs
- `.stitch/system/DESIGN.md` — Design system
- `.stitch/UX.md` — UX overview
- `.stitch/screens.json` — Screen definitions

## Task

Read inputs and produce `.stitch/designs/article-reader/SPEC.md` containing:

1. **Screen Title** — Article Reader
2. **Purpose** — What this screen does and why
3. **Route** — `/education/article/:id`
4. **Widget Name** — `ArticleReaderScreen`
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

- `.stitch/designs/article-reader/SPEC.md` exists and has >50 lines
- All required sections present
- Design tokens reference DESIGN.md values
