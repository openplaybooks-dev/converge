---
id: 002-lift-MoodBanner
title: "Lift: MoodBanner"
description: Move MoodBanner from local widgets to lib/widgets/
tags:
  - lift
  - widget
inputs:
  - lib/screens/mindfulness/widgets/mood_banner.dart
outputs:
  - lib/widgets/mood_banner.dart
checks:
  - id: widget-exists
    description: Shared widget file exists
    cmd: test -f lib/widgets/mood_banner.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: dart analyze lib/widgets/mood_banner.dart
vars:
  widgetName: MoodBanner
  snakeName: mood_banner
  screenId: mindfulness
  screenTitle: null
  localWidgetPath: lib/screens/mindfulness/widgets/mood_banner.dart
  sharedWidgetPath: lib/widgets/mood_banner.dart
  localWidgetsDir: lib/screens/mindfulness/widgets
  screenPath: lib/screens/mindfulness/mindfulness_screen.dart
  subtaskId: 002-lift-MoodBanner
---

# Lift: MoodBanner

Move `MoodBanner` from local screen widgets to the shared widgets directory.

## Steps

1. **Move file** — `lib/screens/mindfulness/widgets/mood_banner.dart` → `lib/widgets/mood_banner.dart`
2. **Update package import** — Change relative import to package import: `package:folio/widgets/mood_banner.dart`
3. **Update all references** — Find all files importing the old path and update them
4. **Verify** — Run `dart analyze` on affected files
