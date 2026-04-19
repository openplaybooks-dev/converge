---
id: 010-06-lift
title: "Lift: Article Reader"
description: Lift shared widgets from Article Reader to lib/widgets/
dependencies:
  - 010-05-split
blocking: true
tags:
  - lift
  - screen-article-reader
inputs:
  - .stitch/designs/article-reader/widgets.jsonl
  - "lib/screens/article_reader/widgets/**/*.dart"
outputs:
  - "lib/widgets/**/*.dart"
wbs:
  type: nodejs
  path: ./wbs.js
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

# Lift: Article Reader

Examine each widget in `lib/screens/article_reader/widgets/` that was marked `shared: true` in `.stitch/designs/article-reader/widgets.jsonl`.

For each shared widget:
1. Move from `lib/screens/article_reader/widgets/{name}.dart` to `lib/widgets/{name}.dart`
2. Update all imports in the screen and any other files referencing it
3. Verify `dart analyze` passes after each move
