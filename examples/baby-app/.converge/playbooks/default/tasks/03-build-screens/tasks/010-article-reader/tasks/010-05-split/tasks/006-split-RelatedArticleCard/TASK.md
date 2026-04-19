---
id: 006-split-RelatedArticleCard
title: "Split: RelatedArticleCard"
description: Extract RelatedArticleCard widget from  screen
tags:
  - split
  - widget
inputs:
  - lib/screens/article_reader/article_reader_screen.dart
outputs:
  - lib/screens/article_reader/widgets/related_article_card.dart
checks:
  - id: widget-exists
    description: Widget file exists
    cmd: test -f lib/screens/article_reader/widgets/related_article_card.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: dart analyze lib/screens/article_reader/widgets/related_article_card.dart
vars:
  name: RelatedArticleCard
  grep: _buildRelatedCard
  description: "Tappable card with custom-painted thumbnail, article title, and topic label used in horizontal list"
  shared: true
  widgetName: RelatedArticleCard
  grepString: _buildRelatedCard
  widgetPath: lib/screens/article_reader/widgets/related_article_card.dart
  localWidgetsDir: lib/screens/article_reader/widgets
  screenPath: lib/screens/article_reader/article_reader_screen.dart
  screenId: article-reader
  screenTitle: null
  subtaskId: 006-split-RelatedArticleCard
---

# Split: RelatedArticleCard

Extract the `RelatedArticleCard` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/article_reader/article_reader_screen.dart` using grep string: `_buildRelatedCard`
2. **Create file** — Write `lib/screens/article_reader/widgets/related_article_card.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `RelatedArticleCard()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class RelatedArticleCard extends StatelessWidget {
  const RelatedArticleCard({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```
