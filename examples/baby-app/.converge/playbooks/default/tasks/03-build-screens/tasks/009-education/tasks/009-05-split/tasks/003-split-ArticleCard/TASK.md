---
id: 003-split-ArticleCard
title: "Split: ArticleCard"
description: Extract ArticleCard widget from  screen
tags:
  - split
  - widget
inputs:
  - lib/screens/education/education_screen.dart
outputs:
  - lib/screens/education/widgets/article_card.dart
checks:
  - id: widget-exists
    description: Widget file exists
    cmd: test -f lib/screens/education/widgets/article_card.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: dart analyze lib/screens/education/widgets/article_card.dart
vars:
  name: ArticleCard
  grep: _buildArticleCard
  description: "List-item card with thumbnail icon, article title, topic label, and bookmark indicator"
  shared: true
  widgetName: ArticleCard
  grepString: _buildArticleCard
  widgetPath: lib/screens/education/widgets/article_card.dart
  localWidgetsDir: lib/screens/education/widgets
  screenPath: lib/screens/education/education_screen.dart
  screenId: education
  screenTitle: null
  subtaskId: 003-split-ArticleCard
---

# Split: ArticleCard

Extract the `ArticleCard` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/education/education_screen.dart` using grep string: `_buildArticleCard`
2. **Create file** — Write `lib/screens/education/widgets/article_card.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `ArticleCard()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class ArticleCard extends StatelessWidget {
  const ArticleCard({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```
