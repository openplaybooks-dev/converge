---
id: 002-lift-ArticleCard
title: "Lift: ArticleCard"
description: Move ArticleCard from local widgets to lib/widgets/
tags:
  - lift
  - widget
inputs:
  - lib/screens/education/widgets/article_card.dart
outputs:
  - lib/widgets/article_card.dart
checks:
  - id: widget-exists
    description: Shared widget file exists
    cmd: test -f lib/widgets/article_card.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: dart analyze lib/widgets/article_card.dart
vars:
  widgetName: ArticleCard
  snakeName: article_card
  screenId: education
  screenTitle: null
  localWidgetPath: lib/screens/education/widgets/article_card.dart
  sharedWidgetPath: lib/widgets/article_card.dart
  localWidgetsDir: lib/screens/education/widgets
  screenPath: lib/screens/education/education_screen.dart
  subtaskId: 002-lift-ArticleCard
---

# Lift: ArticleCard

Move `ArticleCard` from local screen widgets to the shared widgets directory.

## Steps

1. **Move file** — `lib/screens/education/widgets/article_card.dart` → `lib/widgets/article_card.dart`
2. **Update package import** — Change relative import to package import: `package:folio/widgets/article_card.dart`
3. **Update all references** — Find all files importing the old path and update them
4. **Verify** — Run `dart analyze` on affected files
