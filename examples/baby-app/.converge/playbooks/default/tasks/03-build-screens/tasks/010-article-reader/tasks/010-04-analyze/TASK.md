---
id: 010-04-analyze
title: "Analyze: Article Reader"
description: Identify extractable widget regions in Article Reader
dependencies:
  - 010-03-convert
tags:
  - analyze
  - screen-article-reader
inputs:
  - lib/screens/article_reader/article_reader_screen.dart
outputs:
  - .stitch/designs/article-reader/widgets.jsonl
checks:
  - id: widgets-json-exists
    description: widgets.jsonl exists for article-reader
    cmd: test -f .stitch/designs/article-reader/widgets.jsonl
plan:
vars:
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

# Analyze: Article Reader

Analyze the screen widget and identify extractable widget regions.

## Input
- `lib/screens/article_reader/article_reader_screen.dart` — The screen widget file

## Task

Read the screen file and identify widget subtrees that should be extracted into separate widget files.

Write `.stitch/designs/article-reader/widgets.jsonl` with one JSON object per line (JSONL format):

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

- `.stitch/designs/article-reader/widgets.jsonl` exists with valid JSONL
- Each entry has: name, grep, description, shared
- Widget names use PascalCase
