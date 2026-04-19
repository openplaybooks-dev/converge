---
id: 001-lift-TopicChipBar
title: "Lift: TopicChipBar"
description: Move TopicChipBar from local widgets to lib/widgets/
tags:
  - lift
  - widget
inputs:
  - lib/screens/education/widgets/topic_chip_bar.dart
outputs:
  - lib/widgets/topic_chip_bar.dart
checks:
  - id: widget-exists
    description: Shared widget file exists
    cmd: test -f lib/widgets/topic_chip_bar.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: dart analyze lib/widgets/topic_chip_bar.dart
vars:
  widgetName: TopicChipBar
  snakeName: topic_chip_bar
  screenId: education
  screenTitle: null
  localWidgetPath: lib/screens/education/widgets/topic_chip_bar.dart
  sharedWidgetPath: lib/widgets/topic_chip_bar.dart
  localWidgetsDir: lib/screens/education/widgets
  screenPath: lib/screens/education/education_screen.dart
  subtaskId: 001-lift-TopicChipBar
---

# Lift: TopicChipBar

Move `TopicChipBar` from local screen widgets to the shared widgets directory.

## Steps

1. **Move file** — `lib/screens/education/widgets/topic_chip_bar.dart` → `lib/widgets/topic_chip_bar.dart`
2. **Update package import** — Change relative import to package import: `package:folio/widgets/topic_chip_bar.dart`
3. **Update all references** — Find all files importing the old path and update them
4. **Verify** — Run `dart analyze` on affected files
