---
id: 002-split-FeaturedArticleCard
title: "Split: FeaturedArticleCard"
description: Extract FeaturedArticleCard widget from  screen
tags:
  - split
  - widget
inputs:
  - lib/screens/education/education_screen.dart
outputs:
  - lib/screens/education/widgets/featured_article_card.dart
checks:
  - id: widget-exists
    description: Widget file exists
    cmd: test -f lib/screens/education/widgets/featured_article_card.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: dart analyze lib/screens/education/widgets/featured_article_card.dart
vars:
  name: FeaturedArticleCard
  grep: _buildFeaturedCard
  description: "Large hero card with breathing animation icon, title, topic badge, and description"
  shared: false
  widgetName: FeaturedArticleCard
  grepString: _buildFeaturedCard
  widgetPath: lib/screens/education/widgets/featured_article_card.dart
  localWidgetsDir: lib/screens/education/widgets
  screenPath: lib/screens/education/education_screen.dart
  screenId: education
  screenTitle: null
  subtaskId: 002-split-FeaturedArticleCard
---

# Split: FeaturedArticleCard

Extract the `FeaturedArticleCard` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/education/education_screen.dart` using grep string: `_buildFeaturedCard`
2. **Create file** — Write `lib/screens/education/widgets/featured_article_card.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `FeaturedArticleCard()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class FeaturedArticleCard extends StatelessWidget {
  const FeaturedArticleCard({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```
