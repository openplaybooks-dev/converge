---
id: 003-split-ArticleBodyCard
title: "Split: ArticleBodyCard"
description: Extract ArticleBodyCard widget from  screen
tags:
  - split
  - widget
inputs:
  - lib/screens/article_reader/article_reader_screen.dart
outputs:
  - lib/screens/article_reader/widgets/article_body_card.dart
checks:
  - id: widget-exists
    description: Widget file exists
    cmd: test -f lib/screens/article_reader/widgets/article_body_card.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: dart analyze lib/screens/article_reader/widgets/article_body_card.dart
vars:
  name: ArticleBodyCard
  grep: _buildBodyCard
  description: "Rounded card containing article sections with headings, body paragraphs, and a highlighted tip callout block with left border accent"
  shared: false
  widgetName: ArticleBodyCard
  grepString: _buildBodyCard
  widgetPath: lib/screens/article_reader/widgets/article_body_card.dart
  localWidgetsDir: lib/screens/article_reader/widgets
  screenPath: lib/screens/article_reader/article_reader_screen.dart
  screenId: article-reader
  screenTitle: null
  subtaskId: 003-split-ArticleBodyCard
---

# Split: ArticleBodyCard

Extract the `ArticleBodyCard` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/article_reader/article_reader_screen.dart` using grep string: `_buildBodyCard`
2. **Create file** — Write `lib/screens/article_reader/widgets/article_body_card.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `ArticleBodyCard()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class ArticleBodyCard extends StatelessWidget {
  const ArticleBodyCard({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```
