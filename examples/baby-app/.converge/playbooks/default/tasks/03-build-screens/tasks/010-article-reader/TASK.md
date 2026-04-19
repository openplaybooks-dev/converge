---
id: 010-article-reader
title: "Screen: Article Reader"
dependencies:
  - 009-06-lift
tags:
  - screen
  - screen-article-reader
inputs:
  - .stitch/screens.json
  - .stitch/system/DESIGN.md
  - .stitch/UX.md
outputs:
  - lib/screens/article_reader/article_reader_screen.dart
vars:
  screenId: article-reader
  screenTitle: Article Reader
  widgetName: ArticleReader
  route: "/education/article/:id"
---

Parent task for building the "Article Reader" screen through the full pipeline: spec → design → convert → analyze → split → lift.
