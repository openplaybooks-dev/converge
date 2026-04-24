---
id: 002-split-MapCard
title: "Split: MapCard"
description: Extract MapCard widget from  screen
tags:
  - split
  - widget
inputs:
  - lib/screens/home/home_screen.dart
outputs:
  - lib/screens/home/widgets/map_card.dart
checks:
  - id: widget-exists
    description: Widget file exists
    cmd: test -f lib/screens/home/widgets/map_card.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: flutter analyze lib/screens/home/widgets/map_card.dart
vars:
  name: MapCard
  grep: _buildMapCard()
  description: Map display with animated beacon marker and last-seen overlay
  shared: false
  widgetName: MapCard
  grepString: _buildMapCard()
  widgetPath: lib/screens/home/widgets/map_card.dart
  localWidgetsDir: lib/screens/home/widgets
  screenPath: lib/screens/home/home_screen.dart
  screenId: home
  screenTitle: null
  subtaskId: 002-split-MapCard
---

# Split: MapCard

Extract the `MapCard` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/home/home_screen.dart` using grep string: `_buildMapCard()`
2. **Create file** — Write `lib/screens/home/widgets/map_card.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `MapCard()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class MapCard extends StatelessWidget {
  const MapCard({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```
