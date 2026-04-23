---
id: 002-split-ZoneCard
title: "Split: ZoneCard"
description: Extract ZoneCard widget from  screen
tags:
  - split
  - widget
inputs:
  - lib/screens/safe_zones/safe_zones_screen.dart
outputs:
  - lib/screens/safe_zones/widgets/zone_card.dart
checks:
  - id: widget-exists
    description: Widget file exists
    cmd: test -f lib/screens/safe_zones/widgets/zone_card.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: flutter analyze lib/screens/safe_zones/widgets/zone_card.dart
vars:
  name: ZoneCard
  grep: _buildZoneCard(_ZoneData zone
  description: "Card for each safe zone showing name, address, radius badge, toggle switch, and edit icon"
  shared: false
  widgetName: ZoneCard
  grepString: _buildZoneCard(_ZoneData zone
  widgetPath: lib/screens/safe_zones/widgets/zone_card.dart
  localWidgetsDir: lib/screens/safe_zones/widgets
  screenPath: lib/screens/safe_zones/safe_zones_screen.dart
  screenId: safe-zones
  screenTitle: null
  subtaskId: 002-split-ZoneCard
---

# Split: ZoneCard

Extract the `ZoneCard` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/safe_zones/safe_zones_screen.dart` using grep string: `_buildZoneCard(_ZoneData zone`
2. **Create file** — Write `lib/screens/safe_zones/widgets/zone_card.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `ZoneCard()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class ZoneCard extends StatelessWidget {
  const ZoneCard({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```
