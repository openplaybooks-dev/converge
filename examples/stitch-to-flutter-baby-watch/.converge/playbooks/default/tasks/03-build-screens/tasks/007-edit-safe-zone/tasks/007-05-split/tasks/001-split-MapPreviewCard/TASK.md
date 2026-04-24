---
id: 001-split-MapPreviewCard
title: "Split: MapPreviewCard"
description: Extract MapPreviewCard widget from  screen
tags:
  - split
  - widget
inputs:
  - lib/screens/edit_safe_zone/edit_safe_zone_screen.dart
outputs:
  - lib/screens/edit_safe_zone/widgets/map_preview_card.dart
checks:
  - id: widget-exists
    description: Widget file exists
    cmd: test -f lib/screens/edit_safe_zone/widgets/map_preview_card.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: dart analyze lib/screens/edit_safe_zone/widgets/map_preview_card.dart
vars:
  name: MapPreviewCard
  grep: MapPreviewCard
  description: Map preview card showing the safe zone location
  shared: false
  widgetName: MapPreviewCard
  grepString: MapPreviewCard
  widgetPath: lib/screens/edit_safe_zone/widgets/map_preview_card.dart
  localWidgetsDir: lib/screens/edit_safe_zone/widgets
  screenPath: lib/screens/edit_safe_zone/edit_safe_zone_screen.dart
  screenId: edit-safe-zone
  screenTitle: null
  subtaskId: 001-split-MapPreviewCard
---

# Split: MapPreviewCard

Extract the `MapPreviewCard` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/edit_safe_zone/edit_safe_zone_screen.dart` using grep string: `MapPreviewCard`
2. **Create file** — Write `lib/screens/edit_safe_zone/widgets/map_preview_card.dart` with the extracted widget class
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
