---
id: 003-split-EventCard
title: "Split: EventCard"
description: Extract EventCard widget from  screen
tags:
  - split
  - widget
inputs:
  - lib/screens/history/history_screen.dart
outputs:
  - lib/screens/history/widgets/event_card.dart
checks:
  - id: widget-exists
    description: Widget file exists
    cmd: test -f lib/screens/history/widgets/event_card.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: flutter analyze lib/screens/history/widgets/event_card.dart
vars:
  name: EventCard
  grep: class _EventCard extends StatelessWidget
  description: "Event history card showing alert/safe event with badge, child name, time and event label"
  shared: true
  widgetName: EventCard
  grepString: class _EventCard extends StatelessWidget
  widgetPath: lib/screens/history/widgets/event_card.dart
  localWidgetsDir: lib/screens/history/widgets
  screenPath: lib/screens/history/history_screen.dart
  screenId: history
  screenTitle: null
  subtaskId: 003-split-EventCard
---

# Split: EventCard

Extract the `EventCard` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/history/history_screen.dart` using grep string: `class _EventCard extends StatelessWidget`
2. **Create file** — Write `lib/screens/history/widgets/event_card.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `EventCard()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class EventCard extends StatelessWidget {
  const EventCard({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```
