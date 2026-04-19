---
id: 002-lift-RelatedArticleCard
title: "Lift: RelatedArticleCard"
description: Move RelatedArticleCard from local widgets to lib/widgets/
tags:
  - lift
  - widget
inputs:
  - lib/screens/article_reader/widgets/related_article_card.dart
outputs:
  - lib/widgets/related_article_card.dart
checks:
  - id: widget-exists
    description: Shared widget file exists
    cmd: test -f lib/widgets/related_article_card.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: dart analyze lib/widgets/related_article_card.dart
vars:
  widgetName: RelatedArticleCard
  snakeName: related_article_card
  screenId: article-reader
  screenTitle: null
  localWidgetPath: lib/screens/article_reader/widgets/related_article_card.dart
  sharedWidgetPath: lib/widgets/related_article_card.dart
  localWidgetsDir: lib/screens/article_reader/widgets
  screenPath: lib/screens/article_reader/article_reader_screen.dart
  subtaskId: 002-lift-RelatedArticleCard
---

# Lift: RelatedArticleCard

Move `RelatedArticleCard` from local screen widgets to the shared widgets directory.

## Steps

1. **Move file** — `lib/screens/article_reader/widgets/related_article_card.dart` → `lib/widgets/related_article_card.dart`
2. **Update package import** — Change relative import to package import: `package:folio/widgets/related_article_card.dart`
3. **Update all references** — Find all files importing the old path and update them
4. **Verify** — Run `dart analyze` on affected files
