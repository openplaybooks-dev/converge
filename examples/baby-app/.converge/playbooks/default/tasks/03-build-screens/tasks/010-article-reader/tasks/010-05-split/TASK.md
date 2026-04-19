---
id: 010-05-split
title: "Split: Article Reader"
description: Extract widgets from Article Reader screen into local widgets/
dependencies:
  - 010-04-analyze
tags:
  - split
  - screen-article-reader
inputs:
  - .stitch/designs/article-reader/widgets.jsonl
outputs:
  - "lib/screens/article_reader/widgets/**/*.dart"
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

# Split: Article Reader

Extract each widget identified in `.stitch/designs/article-reader/widgets.jsonl` into its own file under `lib/screens/article_reader/widgets/`.

For each widget:
1. Create `lib/screens/article_reader/widgets/{snake_case_name}.dart`
2. Move the widget subtree from the screen file into the new file
3. Update the screen file to import and use the extracted widget
4. Verify `dart analyze` passes after each extraction
