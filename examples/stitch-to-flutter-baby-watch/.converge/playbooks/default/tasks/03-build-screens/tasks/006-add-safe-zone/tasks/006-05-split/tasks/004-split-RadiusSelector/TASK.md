---
id: 004-split-RadiusSelector
title: "Split: RadiusSelector"
description: Extract RadiusSelector widget from  screen
tags:
  - split
  - widget
inputs:
  - lib/screens/add_safe_zone/add_safe_zone_screen.dart
outputs:
  - lib/screens/add_safe_zone/widgets/radius_selector.dart
checks:
  - id: widget-exists
    description: Widget file exists
    cmd: test -f lib/screens/add_safe_zone/widgets/radius_selector.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: dart analyze lib/screens/add_safe_zone/widgets/radius_selector.dart
vars:
  name: RadiusSelector
  grep: "_radii: ['25m', '50m', '100m', '200m']"
  description: Horizontal radius selector with selectable chips
  shared: false
  widgetName: RadiusSelector
  grepString: "_radii: ['25m', '50m', '100m', '200m']"
  widgetPath: lib/screens/add_safe_zone/widgets/radius_selector.dart
  localWidgetsDir: lib/screens/add_safe_zone/widgets
  screenPath: lib/screens/add_safe_zone/add_safe_zone_screen.dart
  screenId: add-safe-zone
  screenTitle: null
  subtaskId: 004-split-RadiusSelector
---

# Split: RadiusSelector

Extract the `RadiusSelector` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/add_safe_zone/add_safe_zone_screen.dart` using grep string: `_radii: ['25m', '50m', '100m', '200m']`
2. **Create file** — Write `lib/screens/add_safe_zone/widgets/radius_selector.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `RadiusSelector()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class RadiusSelector extends StatelessWidget {
  const RadiusSelector({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```
