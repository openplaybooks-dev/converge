---
id: 004-split-BookmarkedArticleCard
title: "Split: BookmarkedArticleCard"
description: Extract BookmarkedArticleCard widget from  screen
tags:
  - split
  - widget
inputs:
  - lib/screens/education/education_screen.dart
outputs:
  - lib/screens/education/widgets/bookmarked_article_card.dart
checks:
  - id: widget-exists
    description: Widget file exists
    cmd: test -f lib/screens/education/widgets/bookmarked_article_card.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: dart analyze lib/screens/education/widgets/bookmarked_article_card.dart
vars:
  name: BookmarkedArticleCard
  grep: _buildBookmarkedCard
  description: Compact card with tall thumbnail area and article info for horizontal bookmarked scroll
  shared: true
  widgetName: BookmarkedArticleCard
  grepString: _buildBookmarkedCard
  widgetPath: lib/screens/education/widgets/bookmarked_article_card.dart
  localWidgetsDir: lib/screens/education/widgets
  screenPath: lib/screens/education/education_screen.dart
  screenId: education
  screenTitle: null
  subtaskId: 004-split-BookmarkedArticleCard
---

# Split: BookmarkedArticleCard

Extract the `BookmarkedArticleCard` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/education/education_screen.dart` using grep string: `_buildBookmarkedCard`
2. **Create file** — Write `lib/screens/education/widgets/bookmarked_article_card.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `BookmarkedArticleCard()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class BookmarkedArticleCard extends StatelessWidget {
  const BookmarkedArticleCard({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```
