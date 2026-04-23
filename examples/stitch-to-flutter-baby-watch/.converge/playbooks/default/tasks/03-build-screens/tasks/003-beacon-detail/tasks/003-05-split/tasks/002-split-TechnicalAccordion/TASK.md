

---
id: 002-split-TechnicalAccordion
title: "Split: TechnicalAccordion"
description: Extract TechnicalAccordion widget from  screen
tags:
  - split
  - widget
inputs:
  - lib/screens/beacon_detail/widgets
outputs:
  - lib/screens/beacon_detail/widgets/technical_accordion.dart
checks:
  - id: widget-exists
    description: Widget file exists
    cmd: test -f lib/screens/beacon_detail/widgets/technical_accordion.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: dart analyze lib/screens/beacon_detail/widgets/technical_accordion.dart
vars:
  name: TechnicalAccordion
  grep: "ListTile(\\n                contentPadding:\\n                    const EdgeInsets.symmetric(horizontal: 24, vertical: 16)"
  description: Collapsible technical details section
  shared: true
  widgetName: TechnicalAccordion
  grepString: "ListTile(\\n                contentPadding:\\n                    const EdgeInsets.symmetric(horizontal: 24, vertical: 16)"
  widgetPath: lib/screens/beacon_detail/widgets/technical_accordion.dart
  localWidgetsDir: lib/screens/beacon_detail/widgets
  screenPath: lib/screens/beacon_detail/beacon_detail_screen.dart
  screenId: beacon-detail
  screenTitle: null
  subtaskId: 002-split-TechnicalAccordion
---

# Split: TechnicalAccordion

Extract the `TechnicalAccordion` widget from the screen into its own file.

## Steps

1. **Locate** — Find the widget subtree in `lib/screens/beacon_detail/widgets` using grep string: `ListTile(\n                contentPadding:\n                    const EdgeInsets.symmetric(horizontal: 24, vertical: 16)`
2. **Create file** — Write `lib/screens/beacon_detail/widgets/technical_accordion.dart` with the extracted widget class
3. **Update screen** — Replace inline widget tree with `TechnicalAccordion()` and add import
4. **Verify** — Run `dart analyze` on both files

## Widget Template

```dart
import 'package:flutter/material.dart';

class TechnicalAccordion extends StatelessWidget {
  const TechnicalAccordion({super.key});

  @override
  Widget build(BuildContext context) {
    // ... extracted widget tree
  }
}
```
```