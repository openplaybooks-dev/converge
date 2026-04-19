---
id: 005-split-RelatedArticlesSection
title: "Split: RelatedArticlesSection"
description: Extract RelatedArticlesSection widget from  screen
tags:
  - split
  - widget
inputs:
  - lib/screens/article_reader/article_reader_screen.dart
outputs:
  - lib/screens/article_reader/widgets/related_articles_section.dart
checks:
  - id: widget-exists
    description: Widget file exists
    cmd: test -f lib/screens/article_reader/widgets/related_articles_section.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: dart analyze lib/screens/article_reader/widgets/related_articles_section.dart
vars:
  name: RelatedArticlesSection
  grep: _buildRelatedSection
  description: "Section with heading and horizontal scrolling list of related article cards with thumbnail, title, and topic"
  shared: false
  widgetName: RelatedArticlesSection
  grepString: _buildRelatedSection
  widgetPath: lib/screens/article_reader/widgets/related_articles_section.dart
  localWidgetsDir: lib/screens/article_reader/widgets
  screenPath: lib/screens/article_reader/article_reader_screen.dart
  screenId: article-reader
  screenTitle: null
  subtaskId: 005-split-RelatedArticlesSection
---

# Split: RelatedArticlesSection

Extract the `RelatedArticlesSection` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/article_reader/article_reader_screen.dart` using grep string: `_buildRelatedSection`
2. **Create file** — Write `lib/screens/article_reader/widgets/related_articles_section.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `RelatedArticlesSection()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class RelatedArticlesSection extends StatelessWidget {
  const RelatedArticlesSection({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```
