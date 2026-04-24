---
id: 001-split-MapCard
title: "Split: MapCard"
description: Extract MapCard widget from  screen
tags:
  - split
  - widget
inputs:
  - lib/screens/safe_zones/safe_zones_screen.dart
outputs:
  - lib/screens/safe_zones/widgets/map_card.dart
checks:
  - id: widget-exists
    description: Widget file exists
    cmd: test -f lib/screens/safe_zones/widgets/map_card.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: flutter analyze lib/screens/safe_zones/widgets/map_card.dart 2>&1 | tail -5
vars:
  name: MapCard
  grep: _buildMapCard(ColorScheme colorScheme
  description: "Card displaying mini map with safe zone circles, baby marker, and glassmorphism tracking overlay"
  shared: false
  widgetName: MapCard
  grepString: _buildMapCard(ColorScheme colorScheme
  widgetPath: lib/screens/safe_zones/widgets/map_card.dart
  localWidgetsDir: lib/screens/safe_zones/widgets
  screenPath: lib/screens/safe_zones/safe_zones_screen.dart
  screenId: safe-zones
  screenTitle: null
  subtaskId: 001-split-MapCard
---

# Split: MapCard

Extract the `MapCard` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/safe_zones/safe_zones_screen.dart` using grep string: `_buildMapCard(ColorScheme colorScheme`
2. **Create file** — Write `lib/screens/safe_zones/widgets/map_card.dart` with the extracted widget class
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
