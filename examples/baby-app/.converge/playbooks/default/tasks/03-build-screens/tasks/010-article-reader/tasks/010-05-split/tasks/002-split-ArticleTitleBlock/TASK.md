---
id: 002-split-ArticleTitleBlock
title: "Split: ArticleTitleBlock"
description: Extract ArticleTitleBlock widget from  screen
tags:
  - split
  - widget
inputs:
  - lib/screens/article_reader/article_reader_screen.dart
outputs:
  - lib/screens/article_reader/widgets/article_title_block.dart
checks:
  - id: widget-exists
    description: Widget file exists
    cmd: test -f lib/screens/article_reader/widgets/article_title_block.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: dart analyze lib/screens/article_reader/widgets/article_title_block.dart
vars:
  name: ArticleTitleBlock
  grep: _buildTitleBlock
  description: "Article title heading with category chip (NUTRITION) and read-time indicator row, fade-in animation"
  shared: false
  widgetName: ArticleTitleBlock
  grepString: _buildTitleBlock
  widgetPath: lib/screens/article_reader/widgets/article_title_block.dart
  localWidgetsDir: lib/screens/article_reader/widgets
  screenPath: lib/screens/article_reader/article_reader_screen.dart
  screenId: article-reader
  screenTitle: null
  subtaskId: 002-split-ArticleTitleBlock
---

# Split: ArticleTitleBlock

Extract the `ArticleTitleBlock` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/article_reader/article_reader_screen.dart` using grep string: `_buildTitleBlock`
2. **Create file** — Write `lib/screens/article_reader/widgets/article_title_block.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `ArticleTitleBlock()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class ArticleTitleBlock extends StatelessWidget {
  const ArticleTitleBlock({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```
