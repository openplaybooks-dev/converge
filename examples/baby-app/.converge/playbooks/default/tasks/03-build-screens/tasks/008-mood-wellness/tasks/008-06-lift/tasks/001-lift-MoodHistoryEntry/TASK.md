---
id: 001-lift-MoodHistoryEntry
title: "Lift: MoodHistoryEntry"
description: Move MoodHistoryEntry from local widgets to lib/widgets/
tags:
  - lift
  - widget
inputs:
  - lib/screens/mood_wellness/widgets/mood_history_entry.dart
outputs:
  - lib/widgets/mood_history_entry.dart
checks:
  - id: widget-exists
    description: Shared widget file exists
    cmd: test -f lib/widgets/mood_history_entry.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: dart analyze lib/widgets/mood_history_entry.dart
vars:
  widgetName: MoodHistoryEntry
  snakeName: mood_history_entry
  screenId: mood-wellness
  screenTitle: null
  localWidgetPath: lib/screens/mood_wellness/widgets/mood_history_entry.dart
  sharedWidgetPath: lib/widgets/mood_history_entry.dart
  localWidgetsDir: lib/screens/mood_wellness/widgets
  screenPath: lib/screens/mood_wellness/mood_wellness_screen.dart
  subtaskId: 001-lift-MoodHistoryEntry
---

# Lift: MoodHistoryEntry

Move `MoodHistoryEntry` from local screen widgets to the shared widgets directory.

## Steps

1. **Move file** — `lib/screens/mood_wellness/widgets/mood_history_entry.dart` → `lib/widgets/mood_history_entry.dart`
2. **Update package import** — Change relative import to package import: `package:folio/widgets/mood_history_entry.dart`
3. **Update all references** — Find all files importing the old path and update them
4. **Verify** — Run `dart analyze` on affected files
