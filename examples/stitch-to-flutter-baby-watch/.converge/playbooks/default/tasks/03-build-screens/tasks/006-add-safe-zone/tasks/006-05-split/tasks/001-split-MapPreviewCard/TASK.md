---
id: 001-split-MapPreviewCard
title: "Split: MapPreviewCard"
description: Extract MapPreviewCard widget from  screen
tags:
  - split
  - widget
inputs:
  - lib/screens/add_safe_zone/add_safe_zone_screen.dart
outputs:
  - lib/screens/add_safe_zone/widgets/map_preview_card.dart
checks:
  - id: widget-exists
    description: Widget file exists
    cmd: test -f lib/screens/add_safe_zone/widgets/map_preview_card.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: dart analyze lib/screens/add_safe_zone/widgets/map_preview_card.dart
vars:
  name: MapPreviewCard
  grep: "blurRadius: 24"
  description: Map preview with location pin and my_location button
  shared: false
  widgetName: MapPreviewCard
  grepString: "blurRadius: 24"
  widgetPath: lib/screens/add_safe_zone/widgets/map_preview_card.dart
  localWidgetsDir: lib/screens/add_safe_zone/widgets
  screenPath: lib/screens/add_safe_zone/add_safe_zone_screen.dart
  screenId: add-safe-zone
  screenTitle: null
  subtaskId: 001-split-MapPreviewCard
---

# Split: MapPreviewCard

Extract the `MapPreviewCard` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/add_safe_zone/add_safe_zone_screen.dart` using grep string: `blurRadius: 24`
2. **Create file** — Write `lib/screens/add_safe_zone/widgets/map_preview_card.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `MapPreviewCard()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class MapPreviewCard extends StatelessWidget {
  const MapPreviewCard({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```
