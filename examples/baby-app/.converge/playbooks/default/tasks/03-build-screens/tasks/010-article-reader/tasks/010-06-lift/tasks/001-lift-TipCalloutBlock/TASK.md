---
id: 001-lift-TipCalloutBlock
title: "Lift: TipCalloutBlock"
description: Move TipCalloutBlock from local widgets to lib/widgets/
tags:
  - lift
  - widget
inputs:
  - lib/screens/article_reader/widgets/tip_callout_block.dart
outputs:
  - lib/widgets/tip_callout_block.dart
checks:
  - id: widget-exists
    description: Shared widget file exists
    cmd: test -f lib/widgets/tip_callout_block.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: dart analyze lib/widgets/tip_callout_block.dart
vars:
  widgetName: TipCalloutBlock
  snakeName: tip_callout_block
  screenId: article-reader
  screenTitle: null
  localWidgetPath: lib/screens/article_reader/widgets/tip_callout_block.dart
  sharedWidgetPath: lib/widgets/tip_callout_block.dart
  localWidgetsDir: lib/screens/article_reader/widgets
  screenPath: lib/screens/article_reader/article_reader_screen.dart
  subtaskId: 001-lift-TipCalloutBlock
---

# Lift: TipCalloutBlock

Move `TipCalloutBlock` from local screen widgets to the shared widgets directory.

## Steps

1. **Move file** — `lib/screens/article_reader/widgets/tip_callout_block.dart` → `lib/widgets/tip_callout_block.dart`
2. **Update package import** — Change relative import to package import: `package:folio/widgets/tip_callout_block.dart`
3. **Update all references** — Find all files importing the old path and update them
4. **Verify** — Run `dart analyze` on affected files
